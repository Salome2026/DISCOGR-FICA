import { sql } from "@vercel/postgres";
import crypto from "crypto";

let ready: Promise<void> | null = null;

// Only a hash of the token is ever stored — the raw token exists solely in
// the emailed URL and the brief request that consumes it, so a DB leak alone
// can't be used to reset anyone's password (same principle as password_hash).
export function ensurePasswordResetsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS password_resets (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS password_resets_email_idx ON password_resets (email)`;
    })();
  }
  return ready;
}

const TOKEN_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string): Promise<string> {
  await ensurePasswordResetsSchema();
  const normalized = email.trim().toLowerCase();

  // Invalidate any previous unused link for this email — only the most
  // recently requested one should ever work.
  await sql`DELETE FROM password_resets WHERE email = ${normalized} AND used_at IS NULL`;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const id = `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  await sql`
    INSERT INTO password_resets (id, email, token_hash, expires_at)
    VALUES (${id}, ${normalized}, ${tokenHash}, ${expiresAt})
  `;

  return token;
}

export async function passwordResetTokenIsValid(token: string): Promise<boolean> {
  await ensurePasswordResetsSchema();
  const tokenHash = hashToken(token);
  const { rows } = await sql`
    SELECT 1 FROM password_resets
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
  `;
  return rows.length > 0;
}

// Atomically checks validity and marks the token used in one statement, so
// two concurrent submits of the same link can't both succeed (one wins, the
// other gets null back as if the link were already used).
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  await ensurePasswordResetsSchema();
  const tokenHash = hashToken(token);
  const { rows } = await sql`
    UPDATE password_resets SET used_at = now()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
    RETURNING email
  `;
  return rows[0] ? (rows[0].email as string) : null;
}
