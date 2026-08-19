// Bootstrap/rescate de una cuenta admin desde la CLI.
//
// La fuente de verdad del esquema es ensureUsersSchema() en lib/db/users.ts.
// Lo de acá abajo es un espejo mínimo para que el script funcione contra una
// base vacía; si agregás columnas allá, replicalas acá o este script vuelve a
// quedar desincronizado (que es exactamente como nació el bug de
// uses_shared_password).
//
// Uso: node --env-file=.env.local scripts/seed-admin.mjs <email> <nombre> <password>
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

// Node >=20.12 puede cargar .env.local solo; si ya venís con las env vars
// puestas (vercel env pull, CI, etc.) esto no molesta.
if (!process.env.POSTGRES_URL) {
  try {
    process.loadEnvFile(new URL("../.env.local", import.meta.url).pathname);
  } catch {
    // sin archivo: seguimos y que falle abajo con un mensaje claro
  }
}

const email = process.argv[2]?.trim().toLowerCase();
const name = process.argv[3];
const password = process.argv[4];

if (!email || !name || !password) {
  console.error("Uso: node --env-file=.env.local scripts/seed-admin.mjs <email> <nombre> <password>");
  process.exit(1);
}

if (!process.env.POSTGRES_URL) {
  console.error("Falta POSTGRES_URL. Corré con --env-file=.env.local o hacé vercel env pull.");
  process.exit(1);
}

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
    created_by TEXT,
    totp_secret TEXT,
    totp_enabled BOOLEAN NOT NULL DEFAULT false,
    totp_backup_codes TEXT[] NOT NULL DEFAULT '{}'
  )
`;

const hash = await bcrypt.hash(password, 10);

// uses_shared_password = false es obligatorio: verifyCredentials() chequea esa
// bandera primero y, si está en true, compara contra el hash compartido de
// app_settings e ignora por completo password_hash (lib/db/users.ts:141).
// session_version += 1 replica el forceLogout() que hace el reset de la app,
// para que las sesiones abiertas con la contraseña vieja se caigan.
const { rows } = await sql`
  INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, created_by)
  VALUES (${email}, ${name}, ${hash}, false, 'empresa', 'admin', 'seed-script')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = ${hash},
    uses_shared_password = false,
    role = 'admin',
    active = true,
    session_version = app_users.session_version + 1
  RETURNING email, role, session_version, (xmax = 0) AS created
`;

const row = rows[0];
console.log(`Admin ${row.created ? "creado" : "actualizado"}: ${row.email} (session_version ${row.session_version})`);
if (!row.created) {
  console.log("Las sesiones abiertas de esta cuenta quedaron invalidadas.");
}
