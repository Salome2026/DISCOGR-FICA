import { sql } from "@vercel/postgres";
import { ensureSettingsSchema } from "@/lib/db/settings";

const SPOTIFY_CONNECTION_KEY = "spotify_connection";

export type SpotifyConnection = {
  refreshToken: string;
  spotifyUserId: string;
  displayName: string | null;
  scope: string;
  connectedBy: string;
  connectedAt: string;
};

export async function getSpotifyConnection(): Promise<SpotifyConnection | null> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${SPOTIFY_CONNECTION_KEY}`;
  const raw = rows[0]?.value as string | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyConnection;
  } catch {
    return null;
  }
}

export async function saveSpotifyConnection(conn: SpotifyConnection): Promise<void> {
  await ensureSettingsSchema();
  const value = JSON.stringify(conn);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${SPOTIFY_CONNECTION_KEY}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
}

export async function clearSpotifyConnection(): Promise<void> {
  await ensureSettingsSchema();
  await sql`DELETE FROM app_settings WHERE key = ${SPOTIFY_CONNECTION_KEY}`;
}
