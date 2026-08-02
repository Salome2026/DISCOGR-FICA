import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

const email = process.argv[2];
const name = process.argv[3];
const password = process.argv[4];

if (!email || !name || !password) {
  console.error("Uso: node scripts/seed-admin.mjs <email> <nombre> <password>");
  process.exit(1);
}

await sql`
  CREATE TABLE IF NOT EXISTS app_users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
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

const hash = await bcrypt.hash(password, 10);

await sql`
  INSERT INTO app_users (email, name, password_hash, account_type, role, created_by)
  VALUES (${email}, ${name}, ${hash}, 'empresa', 'admin', 'seed-script')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = ${hash}, role = 'admin', active = true
`;

console.log(`Admin creado/actualizado: ${email}`);
