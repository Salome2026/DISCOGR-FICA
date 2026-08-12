import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import type { AccountType, Permission, Role } from "@/lib/permissions";
import { getSharedPasswordHash } from "@/lib/db/settings";
import { sendSecurityAlert } from "@/lib/emailAuth";

// Email is the primary key and login identifier, so it must be treated as
// case-insensitive everywhere: "Usuario@Empresa.com" and "usuario@empresa.com"
// are the same account. Every function below normalizes its email input(s)
// through this before touching the DB.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

let ready: Promise<void> | null = null;

export function ensureUsersSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_users (
          email TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          password_hash TEXT,
          uses_shared_password BOOLEAN NOT NULL DEFAULT false,
          account_type TEXT NOT NULL DEFAULT 'empresa',
          role TEXT NOT NULL DEFAULT 'invitado',
          extra_permissions TEXT[] NOT NULL DEFAULT '{}',
          revoked_permissions TEXT[] NOT NULL DEFAULT '{}',
          active BOOLEAN NOT NULL DEFAULT true,
          session_version INTEGER NOT NULL DEFAULT 1,
          last_login TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by TEXT
        )
      `;
      await sql`ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS uses_shared_password BOOLEAN NOT NULL DEFAULT false`;
      // TOTP 2FA — opt-in per account. totp_secret stays NULL until the QR
      // is scanned and confirmed (setupTotp writes it, confirmTotp is what
      // flips totp_enabled). Backup codes are bcrypt-hashed exactly like a
      // password — they're a second way in, so they get the same protection.
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS totp_secret TEXT`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[] NOT NULL DEFAULT '{}'`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_artist_assignments (
          id BIGSERIAL PRIMARY KEY,
          pm_email TEXT NOT NULL REFERENCES app_users(email) ON DELETE CASCADE,
          artist_name TEXT NOT NULL,
          UNIQUE (pm_email, artist_name)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS user_activity_log (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          action TEXT NOT NULL,
          at TIMESTAMPTZ NOT NULL DEFAULT now(),
          detail TEXT
        )
      `;
      // This table doubles as the platform's general audit log now, not
      // just user-management events — see recordAudit()/getAuditLog()
      // below. Additive columns so every row logged before this stays
      // exactly as it was (email/action/at/detail keep their meaning).
      await sql`ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS entity_type TEXT`;
      await sql`ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS entity_id TEXT`;
      await sql`ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS before_state JSONB`;
      await sql`ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS after_state JSONB`;
      await sql`CREATE INDEX IF NOT EXISTS user_activity_log_entity_idx ON user_activity_log (entity_type, entity_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          ip TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts (email, created_at)`;
    })();
  }
  return ready;
}

export type AppUser = {
  email: string;
  name: string;
  account_type: AccountType;
  role: Role;
  extra_permissions: Permission[];
  revoked_permissions: Permission[];
  active: boolean;
  session_version: number;
  last_login: string | null;
  uses_shared_password: boolean;
  totp_enabled: boolean;
};

export type LoginOutcome =
  | { status: "ok"; user: AppUser }
  | { status: "invalid" }
  | { status: "locked" }
  | { status: "needs_totp" }
  | { status: "invalid_totp" };

// Shared by both the web login (auth.ts's authorize()) and the mobile
// login route — a single choke point, so the lockout check (and now 2FA)
// protects both without needing to be wired in twice.
export async function verifyCredentials(email: string, password: string, totpCode?: string): Promise<LoginOutcome> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);

  // Checked before the DB lookup and well before bcrypt.compare — a locked
  // email fails fast without spending the (deliberately slow) hash compare.
  if (await isLoginLocked(normalized)) return { status: "locked" };

  const { rows } = await sql`SELECT * FROM app_users WHERE lower(email) = ${normalized}`;
  const user = rows[0];
  if (!user || !user.active) {
    await alertOnFailedLogin(normalized);
    return { status: "invalid" };
  }

  let ok = false;
  if (user.uses_shared_password) {
    const sharedHash = await getSharedPasswordHash();
    ok = !!sharedHash && (await bcrypt.compare(password, sharedHash));
  } else if (user.password_hash) {
    ok = await bcrypt.compare(password, user.password_hash);
  }
  if (!ok) {
    await alertOnFailedLogin(normalized);
    return { status: "invalid" };
  }

  if (user.totp_enabled) {
    if (!totpCode) return { status: "needs_totp" };
    // A wrong code counts toward the same lockout as a wrong password — a
    // 6-digit TOTP code is only ~1M possibilities, guessable fast without
    // a rate limit of its own.
    const validCode = await verifyTotpOrBackupCode(normalized, totpCode);
    if (!validCode) {
      await alertOnFailedLogin(normalized);
      return { status: "invalid_totp" };
    }
  }

  await clearLoginAttempts(normalized);
  await sql`UPDATE app_users SET last_login = now() WHERE lower(email) = ${normalized}`;
  await logActivity(user.email as string, "login");
  return { status: "ok", user: toAppUser(user) };
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const { rows } = await sql`SELECT * FROM app_users WHERE lower(email) = ${normalized}`;
  return rows[0] ? toAppUser(rows[0]) : null;
}

function toAppUser(row: Record<string, unknown>): AppUser {
  return {
    email: row.email as string,
    name: row.name as string,
    account_type: row.account_type as AccountType,
    role: row.role as Role,
    extra_permissions: (row.extra_permissions as Permission[]) ?? [],
    revoked_permissions: (row.revoked_permissions as Permission[]) ?? [],
    active: row.active as boolean,
    session_version: row.session_version as number,
    last_login: row.last_login as string | null,
    uses_shared_password: row.uses_shared_password as boolean,
    totp_enabled: row.totp_enabled as boolean,
  };
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  accountType: AccountType;
  role: Role;
  createdBy: string;
}) {
  await ensureUsersSchema();
  const email = normalizeEmail(input.email);
  const hash = await bcrypt.hash(input.password, 10);
  await sql`
    INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, created_by)
    VALUES (${email}, ${input.name}, ${hash}, false, ${input.accountType}, ${input.role}, ${input.createdBy})
  `;
  await logActivity(input.createdBy, "user_created", email);
}

// Quick-add: no individual password — the person logs in with their email +
// whatever the admin has set as the shared/common password.
export async function createUserWithSharedPassword(input: {
  email: string;
  name: string;
  accountType: AccountType;
  role: Role;
  createdBy: string;
}) {
  await ensureUsersSchema();
  const email = normalizeEmail(input.email);
  await sql`
    INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, created_by)
    VALUES (${email}, ${input.name}, NULL, true, ${input.accountType}, ${input.role}, ${input.createdBy})
    ON CONFLICT (email) DO UPDATE SET
      uses_shared_password = true, role = ${input.role}, account_type = ${input.accountType}, active = true
  `;
  await logActivity(input.createdBy, "user_quick_added", email);
}

export async function listUsers(): Promise<AppUser[]> {
  await ensureUsersSchema();
  const { rows } = await sql`SELECT * FROM app_users ORDER BY created_at ASC`;
  return rows.map(toAppUser);
}

function pgArrayLiteral(items: string[]): string {
  return `{${items.map((i) => `"${i.replace(/"/g, '\\"')}"`).join(",")}}`;
}

export async function updateUserRole(
  email: string,
  role: Role,
  extraPermissions: Permission[],
  revokedPermissions: Permission[],
  actorEmail: string
) {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const before = await getUserByEmail(normalized);
  const extraLit = pgArrayLiteral(extraPermissions);
  const revokedLit = pgArrayLiteral(revokedPermissions);
  await sql`
    UPDATE app_users
    SET role = ${role},
        extra_permissions = ${extraLit}::text[],
        revoked_permissions = ${revokedLit}::text[]
    WHERE lower(email) = ${normalized}
  `;
  await recordAudit({
    actorEmail,
    action: "role_updated",
    entityType: "user",
    entityId: normalized,
    detail: normalized,
    before: before ? { role: before.role, extraPermissions: before.extra_permissions, revokedPermissions: before.revoked_permissions } : undefined,
    after: { role, extraPermissions, revokedPermissions },
  });
}

export async function setUserActive(email: string, active: boolean, actorEmail: string) {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const before = await getUserByEmail(normalized);
  await sql`UPDATE app_users SET active = ${active} WHERE lower(email) = ${normalized}`;
  await recordAudit({
    actorEmail,
    action: active ? "user_activated" : "user_deactivated",
    entityType: "user",
    entityId: normalized,
    detail: normalized,
    before: before ? { active: before.active } : undefined,
    after: { active },
  });
}

export async function resetPassword(email: string, newPassword: string, actorEmail: string) {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const hash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE app_users SET password_hash = ${hash}, uses_shared_password = false WHERE lower(email) = ${normalized}`;
  await logActivity(actorEmail, "password_reset", normalized);
}

export async function forceLogout(email: string, actorEmail: string) {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  await sql`UPDATE app_users SET session_version = session_version + 1 WHERE lower(email) = ${normalized}`;
  await logActivity(actorEmail, "force_logout", normalized);
}

export async function logActivity(email: string, action: string, detail?: string) {
  await ensureUsersSchema();
  await sql`INSERT INTO user_activity_log (email, action, detail) VALUES (${email}, ${action}, ${detail ?? null})`;
}

export async function getActivityLog(limit = 100) {
  await ensureUsersSchema();
  const { rows } = await sql`
    SELECT * FROM user_activity_log ORDER BY at DESC LIMIT ${limit}
  `;
  return rows;
}

// Richer sibling of logActivity — same table, same "email = who did it"
// convention, plus a typed entity reference and a before/after snapshot so
// a change can actually be reconstructed later, not just noticed. Nothing
// in this codebase updates or deletes a row here — that's what makes it an
// audit log instead of a mutable activity feed.
export type AuditEntry = {
  id: number;
  email: string;
  action: string;
  at: string;
  detail: string | null;
  entityType: string | null;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
};

export async function recordAudit(entry: {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  detail?: string | null;
}): Promise<void> {
  await ensureUsersSchema();
  await sql`
    INSERT INTO user_activity_log (email, action, detail, entity_type, entity_id, before_state, after_state)
    VALUES (
      ${entry.actorEmail}, ${entry.action}, ${entry.detail ?? null}, ${entry.entityType}, ${entry.entityId ?? null},
      ${entry.before !== undefined ? JSON.stringify(entry.before) : null}::jsonb,
      ${entry.after !== undefined ? JSON.stringify(entry.after) : null}::jsonb
    )
  `;
}

export async function getAuditLog(opts?: { entityType?: string; entityId?: string; limit?: number }): Promise<AuditEntry[]> {
  await ensureUsersSchema();
  const limit = opts?.limit ?? 200;
  const { rows } =
    opts?.entityType && opts?.entityId
      ? await sql`SELECT * FROM user_activity_log WHERE entity_type = ${opts.entityType} AND entity_id = ${opts.entityId} ORDER BY at DESC LIMIT ${limit}`
      : opts?.entityType
        ? await sql`SELECT * FROM user_activity_log WHERE entity_type = ${opts.entityType} ORDER BY at DESC LIMIT ${limit}`
        : await sql`SELECT * FROM user_activity_log ORDER BY at DESC LIMIT ${limit}`;
  return rows.map((r) => ({
    id: r.id as number,
    email: r.email as string,
    action: r.action as string,
    at: r.at as string,
    detail: (r.detail as string | null) ?? null,
    entityType: (r.entity_type as string | null) ?? null,
    entityId: (r.entity_id as string | null) ?? null,
    beforeState: r.before_state,
    afterState: r.after_state,
  }));
}

// Login brute-force protection. Threshold/window are deliberately loose
// (a real user mistyping a password a couple of times should never notice
// this exists) — 5 failures in 15 minutes locks that email out for 15
// minutes, checked before bcrypt.compare ever runs so a lockout also saves
// the (comparatively expensive) hash comparison.
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

export async function isLoginLocked(email: string): Promise<boolean> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const { rows } = await sql`
    SELECT count(*) AS n FROM login_attempts
    WHERE email = ${normalized} AND created_at > now() - (${LOGIN_ATTEMPT_WINDOW_MINUTES} * interval '1 minute')
  `;
  return Number(rows[0]?.n ?? 0) >= LOGIN_ATTEMPT_LIMIT;
}

// Returns the attempt count within the current window right after
// inserting, so the caller can tell exactly when a lockout is newly
// triggered (count === LOGIN_ATTEMPT_LIMIT) versus already in effect —
// used to fire the security-alert email exactly once per lockout instead
// of once per attempt.
export async function recordFailedLogin(email: string, ip: string | null): Promise<number> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  await sql`INSERT INTO login_attempts (email, ip) VALUES (${normalized}, ${ip})`;
  const { rows } = await sql`
    SELECT count(*) AS n FROM login_attempts
    WHERE email = ${normalized} AND created_at > now() - (${LOGIN_ATTEMPT_WINDOW_MINUTES} * interval '1 minute')
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  await sql`DELETE FROM login_attempts WHERE email = ${normalized}`;
}

// Records the failure and, exactly on the attempt that crosses the lockout
// threshold, emails salome@mawzrecords.com. Fire-and-forget on purpose —
// a Resend hiccup should never be the reason a login request hangs or
// fails differently than normal.
async function alertOnFailedLogin(normalizedEmail: string): Promise<void> {
  const attempts = await recordFailedLogin(normalizedEmail, null);
  if (attempts === LOGIN_ATTEMPT_LIMIT) {
    sendSecurityAlert({
      email: normalizedEmail,
      reason: "Cuenta bloqueada por intentos de inicio de sesión repetidos",
      attempts,
    }).catch((err) => console.error("No se pudo enviar la alerta de seguridad:", err));
  }
}

export async function getAssignedArtists(email: string): Promise<string[]> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const { rows } = await sql`
    SELECT artist_name FROM pm_artist_assignments WHERE lower(pm_email) = ${normalized}
  `;
  return rows.map((r) => r.artist_name as string);
}

export async function setAssignedArtists(email: string, artists: string[]) {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  await sql`DELETE FROM pm_artist_assignments WHERE lower(pm_email) = ${normalized}`;
  for (const artist of artists) {
    await sql`
      INSERT INTO pm_artist_assignments (pm_email, artist_name)
      VALUES (${normalized}, ${artist})
      ON CONFLICT DO NOTHING
    `;
  }
}

// ---- 2FA (TOTP) ----
// Opt-in per account, standard Google Authenticator/Authy compatible codes
// — no SMS provider, no new external service. The secret only ever leaves
// this file inside the otpauth:// URI returned by setupTotp (rendered as a
// QR client-side) and is never included on the generic AppUser type.

function totpFor(email: string, secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "VPO Corp",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export async function setupTotp(email: string): Promise<{ secret: string; uri: string }> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const secret = new OTPAuth.Secret({ size: 20 });
  // Not enabled yet — only confirmTotp() flips totp_enabled, once the user
  // proves they actually scanned it by entering a real code back.
  await sql`UPDATE app_users SET totp_secret = ${secret.base32} WHERE lower(email) = ${normalized}`;
  return { secret: secret.base32, uri: totpFor(normalized, secret.base32).toString() };
}

function generateBackupCodes(count = 10): { display: string; canonical: string }[] {
  const out: { display: string; canonical: string }[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    out.push({ canonical: raw, display: `${raw.slice(0, 5)}-${raw.slice(5)}` });
  }
  return out;
}

function normalizeBackupCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
}

export async function confirmTotp(email: string, code: string): Promise<{ backupCodes: string[] } | { error: string }> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  const { rows } = await sql`SELECT totp_secret FROM app_users WHERE lower(email) = ${normalized}`;
  const secretBase32 = rows[0]?.totp_secret as string | null;
  if (!secretBase32) return { error: "Primero generá el código QR." };

  const delta = totpFor(normalized, secretBase32).validate({ token: code.trim(), window: 1 });
  if (delta === null) return { error: "Código inválido." };

  const codes = generateBackupCodes();
  const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c.canonical, 10)));
  await sql`
    UPDATE app_users SET totp_enabled = true, totp_backup_codes = ${pgArrayLiteral(hashed)}::text[]
    WHERE lower(email) = ${normalized}
  `;
  await recordAudit({ actorEmail: normalized, action: "totp_enabled", entityType: "user", entityId: normalized });
  return { backupCodes: codes.map((c) => c.display) };
}

export async function disableTotp(email: string, actorEmail: string): Promise<void> {
  await ensureUsersSchema();
  const normalized = normalizeEmail(email);
  await sql`
    UPDATE app_users SET totp_enabled = false, totp_secret = NULL, totp_backup_codes = '{}'
    WHERE lower(email) = ${normalized}
  `;
  await recordAudit({ actorEmail, action: "totp_disabled", entityType: "user", entityId: normalized });
}

// Called from verifyCredentials during login. Tries a live 6-digit code
// first, then falls back to backup codes — a matched backup code is
// removed immediately so it can't be reused (each one is single-use).
async function verifyTotpOrBackupCode(normalizedEmail: string, code: string): Promise<boolean> {
  const { rows } = await sql`SELECT totp_secret, totp_backup_codes FROM app_users WHERE lower(email) = ${normalizedEmail}`;
  const row = rows[0];
  const secretBase32 = row?.totp_secret as string | null;
  if (!secretBase32) return false;

  const trimmed = code.trim();
  if (/^\d{6}$/.test(trimmed)) {
    const delta = totpFor(normalizedEmail, secretBase32).validate({ token: trimmed, window: 1 });
    if (delta !== null) return true;
  }

  const backupHashes = (row?.totp_backup_codes as string[]) ?? [];
  const normalizedInput = normalizeBackupCode(trimmed);
  if (!normalizedInput) return false;
  for (let i = 0; i < backupHashes.length; i++) {
    if (await bcrypt.compare(normalizedInput, backupHashes[i])) {
      const remaining = backupHashes.filter((_, idx) => idx !== i);
      await sql`UPDATE app_users SET totp_backup_codes = ${pgArrayLiteral(remaining)}::text[] WHERE lower(email) = ${normalizedEmail}`;
      return true;
    }
  }
  return false;
}
