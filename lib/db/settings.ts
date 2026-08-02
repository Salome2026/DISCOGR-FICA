import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

let ready: Promise<void> | null = null;

export function ensureSettingsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `;
    })();
  }
  return ready;
}

const SHARED_PASSWORD_KEY = "shared_password_hash";

export async function getSharedPasswordHash(): Promise<string | null> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${SHARED_PASSWORD_KEY}`;
  return (rows[0]?.value as string | undefined) ?? null;
}

export async function setSharedPassword(password: string) {
  await ensureSettingsSchema();
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${SHARED_PASSWORD_KEY}, ${hash})
    ON CONFLICT (key) DO UPDATE SET value = ${hash}
  `;
}

export async function hasSharedPassword(): Promise<boolean> {
  const hash = await getSharedPasswordHash();
  return !!hash;
}
