import { sql } from "@vercel/postgres";
import crypto from "crypto";

// "Remember this device" for 2FA — a sliding 30-day trust window per
// browser. Same token/hash pattern as password_resets.ts: only a hash is
// ever stored, so a DB leak alone can't forge a trusted device. Deliberately
// its own file/table (not a column on app_users) because a single account
// can have several trusted devices (phone + laptop) at once.
let ready: Promise<void> | null = null;

export function ensureTrustedDevicesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS trusted_devices (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS trusted_devices_email_idx ON trusted_devices (email)`;
    })();
  }
  return ready;
}

const TRUST_TTL_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Called after every successful login on a 2FA account — whether the code
// was just typed in, or the device was already trusted. Renewing on the
// trusted path too is what makes this a sliding window: keep logging in
// from the same browser and it never re-prompts; stop for 30+ days and the
// next login asks for the code again, same as a device that was never
// trusted. If `existingToken` still points at a live row, that row is
// renewed in place (same cookie value survives); otherwise a fresh token is
// issued, covering both "first time trusting this browser" and "the old
// cookie already expired/was revoked".
export async function trustDevice(email: string, existingToken: string | null): Promise<string> {
  await ensureTrustedDevicesSchema();
  const normalized = normalizeEmail(email);
  const expiresAt = new Date(Date.now() + TRUST_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  if (existingToken) {
    const tokenHash = hashToken(existingToken);
    const { rows } = await sql`
      UPDATE trusted_devices SET expires_at = ${expiresAt}
      WHERE token_hash = ${tokenHash} AND email = ${normalized}
      RETURNING token_hash
    `;
    if (rows.length > 0) return existingToken;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await sql`
    INSERT INTO trusted_devices (email, token_hash, expires_at)
    VALUES (${normalized}, ${tokenHash}, ${expiresAt})
  `;
  return token;
}

// Used by login-check and the real sign-in to decide whether this browser
// can skip the TOTP prompt for this specific account. Scoped to `email` on
// purpose — a shared computer's cookie only ever trusts the one account
// that set it, never a different email logging in on the same browser.
export async function isDeviceTrusted(email: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  await ensureTrustedDevicesSchema();
  const normalized = normalizeEmail(email);
  const tokenHash = hashToken(token);
  const { rows } = await sql`
    SELECT 1 FROM trusted_devices
    WHERE token_hash = ${tokenHash} AND email = ${normalized} AND expires_at > now()
  `;
  return rows.length > 0;
}

// Revokes every trusted device for an account in one shot — wired into
// forceLogout()/resetPassword()/disableTotp() so any of those "start over"
// actions also makes every browser prove 2FA again next time, not just the
// one that triggered it.
export async function revokeAllTrustedDevices(email: string): Promise<void> {
  await ensureTrustedDevicesSchema();
  const normalized = normalizeEmail(email);
  await sql`DELETE FROM trusted_devices WHERE email = ${normalized}`;
}
