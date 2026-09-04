import { sql } from "@vercel/postgres";
import crypto from "crypto";

let ready: Promise<void> | null = null;

// Token privado y revocable por (usuario, scope) — el mismo diseño para
// cualquier calendario futuro que necesite suscripción vía webcal/.ics, no
// solo "reuniones de Management". El feed público (app/api/management-
// meetings/feed/route.ts) no tiene sesión de por medio (lo pide la app de
// calendario del sistema operativo, no un browser logueado) así que este
// token ES la autenticación — nunca se piden credenciales de iCloud/Apple,
// solo se identifica al usuario por este string opaco.
export function ensureCalendarFeedTokensSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS calendar_feed_tokens (
          token TEXT PRIMARY KEY,
          user_email TEXT NOT NULL,
          scope TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          revoked_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS calendar_feed_tokens_active_idx
        ON calendar_feed_tokens (user_email, scope) WHERE revoked_at IS NULL
      `;
    })();
  }
  return ready;
}

function newToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function getOrCreateToken(userEmail: string, scope: string): Promise<string> {
  await ensureCalendarFeedTokensSchema();
  const { rows } = await sql`
    SELECT token FROM calendar_feed_tokens WHERE user_email = ${userEmail} AND scope = ${scope} AND revoked_at IS NULL
  `;
  if (rows[0]) return rows[0].token as string;
  const token = newToken();
  await sql`
    INSERT INTO calendar_feed_tokens (token, user_email, scope) VALUES (${token}, ${userEmail}, ${scope})
  `;
  return token;
}

// Revoca el token activo (si hay uno) — la próxima llamada a
// getOrCreateToken emite uno nuevo, invalidando cualquier suscripción vieja
// (Apple Calendar empieza a recibir 401 en ese link y deja de sincronizar).
export async function revokeToken(userEmail: string, scope: string): Promise<void> {
  await ensureCalendarFeedTokensSchema();
  await sql`
    UPDATE calendar_feed_tokens SET revoked_at = now()
    WHERE user_email = ${userEmail} AND scope = ${scope} AND revoked_at IS NULL
  `;
}

export async function getUserByToken(token: string, scope: string): Promise<string | null> {
  await ensureCalendarFeedTokensSchema();
  const { rows } = await sql`
    SELECT user_email FROM calendar_feed_tokens WHERE token = ${token} AND scope = ${scope} AND revoked_at IS NULL
  `;
  return rows[0] ? (rows[0].user_email as string) : null;
}
