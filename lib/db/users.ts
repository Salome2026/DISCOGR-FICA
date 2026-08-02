import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import type { AccountType, Permission, Role } from "@/lib/permissions";
import { getSharedPasswordHash } from "@/lib/db/settings";

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
};

export async function verifyCredentials(email: string, password: string): Promise<AppUser | null> {
  await ensureUsersSchema();
  const { rows } = await sql`SELECT * FROM app_users WHERE email = ${email}`;
  const user = rows[0];
  if (!user || !user.active) return null;

  let ok = false;
  if (user.uses_shared_password) {
    const sharedHash = await getSharedPasswordHash();
    ok = !!sharedHash && (await bcrypt.compare(password, sharedHash));
  } else if (user.password_hash) {
    ok = await bcrypt.compare(password, user.password_hash);
  }
  if (!ok) return null;

  await sql`UPDATE app_users SET last_login = now() WHERE email = ${email}`;
  await logActivity(email, "login");
  return toAppUser(user);
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  await ensureUsersSchema();
  const { rows } = await sql`SELECT * FROM app_users WHERE email = ${email}`;
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
  const hash = await bcrypt.hash(input.password, 10);
  await sql`
    INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, created_by)
    VALUES (${input.email}, ${input.name}, ${hash}, false, ${input.accountType}, ${input.role}, ${input.createdBy})
  `;
  await logActivity(input.createdBy, "user_created", input.email);
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
  await sql`
    INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, created_by)
    VALUES (${input.email}, ${input.name}, NULL, true, ${input.accountType}, ${input.role}, ${input.createdBy})
    ON CONFLICT (email) DO UPDATE SET
      uses_shared_password = true, role = ${input.role}, account_type = ${input.accountType}, active = true
  `;
  await logActivity(input.createdBy, "user_quick_added", input.email);
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
  const extraLit = pgArrayLiteral(extraPermissions);
  const revokedLit = pgArrayLiteral(revokedPermissions);
  await sql`
    UPDATE app_users
    SET role = ${role},
        extra_permissions = ${extraLit}::text[],
        revoked_permissions = ${revokedLit}::text[]
    WHERE email = ${email}
  `;
  await logActivity(actorEmail, "role_updated", email);
}

export async function setUserActive(email: string, active: boolean, actorEmail: string) {
  await ensureUsersSchema();
  await sql`UPDATE app_users SET active = ${active} WHERE email = ${email}`;
  await logActivity(actorEmail, active ? "user_activated" : "user_deactivated", email);
}

export async function resetPassword(email: string, newPassword: string, actorEmail: string) {
  await ensureUsersSchema();
  const hash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE app_users SET password_hash = ${hash}, uses_shared_password = false WHERE email = ${email}`;
  await logActivity(actorEmail, "password_reset", email);
}

export async function forceLogout(email: string, actorEmail: string) {
  await ensureUsersSchema();
  await sql`UPDATE app_users SET session_version = session_version + 1 WHERE email = ${email}`;
  await logActivity(actorEmail, "force_logout", email);
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

export async function getAssignedArtists(email: string): Promise<string[]> {
  await ensureUsersSchema();
  const { rows } = await sql`
    SELECT artist_name FROM pm_artist_assignments WHERE pm_email = ${email}
  `;
  return rows.map((r) => r.artist_name as string);
}

export async function setAssignedArtists(email: string, artists: string[]) {
  await ensureUsersSchema();
  await sql`DELETE FROM pm_artist_assignments WHERE pm_email = ${email}`;
  for (const artist of artists) {
    await sql`
      INSERT INTO pm_artist_assignments (pm_email, artist_name)
      VALUES (${email}, ${artist})
      ON CONFLICT DO NOTHING
    `;
  }
}
