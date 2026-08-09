// Spotify integration — acts on the label's own Spotify account (OAuth
// Authorization Code flow), not user login.
//
// Same shape as lib/chartmetric.ts (cached access token + expiry,
// a configured() check, a fetch wrapper) with one deliberate deviation: the
// refresh token lives in the DB (lib/db/spotifySettings.ts), not an env var.
// A Spotify refresh token can be revoked (password change, manual revoke by
// the label) and whoever needs to reconnect at that point may not have
// Vercel access — with DB storage, reconnecting is just re-authorizing from
// inside the app itself, no redeploy. SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET
// stay as env vars (static app credentials, never rotate).

import { getSpotifyConnection, saveSpotifyConnection, type SpotifyConnection } from "@/lib/db/spotifySettings";

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "playlist-modify-public",
  "playlist-modify-private",
  "ugc-image-upload",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function spotifyConfigured(): Promise<boolean> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return false;
  const conn = await getSpotifyConnection();
  return !!conn?.refreshToken;
}

function basicAuthHeader(): string {
  const id = process.env.SPOTIFY_CLIENT_ID ?? "";
  const secret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function refreshAccessToken(conn: SpotifyConnection): Promise<string> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Spotify auth error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  // Spotify may rotate the refresh token on refresh — if it does and we
  // don't persist it, the integration breaks silently the next time the old
  // one gets rejected.
  if (data.refresh_token && data.refresh_token !== conn.refreshToken) {
    await saveSpotifyConnection({ ...conn, refreshToken: data.refresh_token });
  }
  return cachedToken.token;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const conn = await getSpotifyConnection();
  if (!conn?.refreshToken) {
    throw new Error("Spotify no está conectado todavía.");
  }
  return refreshAccessToken(conn);
}

async function spotifyFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${SPOTIFY_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 && !retried) {
    await getAccessToken(true);
    return spotifyFetch(path, init, true);
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
    await new Promise((r) => setTimeout(r, (retryAfter + 0.5) * 1000));
    return spotifyFetch(path, init, retried);
  }
  return res;
}

async function spotifyJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await spotifyFetch(path, init);
  if (!res.ok) {
    throw new Error(`Spotify API error ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// --- OAuth (used only by the authorize/callback routes) ---

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

export type SpotifyTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
};

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<SpotifyTokenResponse> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    throw new Error(`Spotify token exchange error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// --- Wrapped endpoints ---

export type SpotifyMe = { id: string; display_name: string | null };

export async function getMeWithToken(accessToken: string): Promise<SpotifyMe> {
  const res = await fetch(`${SPOTIFY_API}/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Spotify /me error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getMe(): Promise<SpotifyMe> {
  return spotifyJson<SpotifyMe>("/me");
}

export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[] | null;
  tracks: { total: number };
  external_urls: { spotify: string };
  public: boolean | null;
};

export async function listMyPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const out: SpotifyPlaylistSummary[] = [];
  let next: string | null = "/me/playlists?limit=50";
  while (next) {
    const data: { items: SpotifyPlaylistSummary[]; next: string | null } = await spotifyJson(next);
    out.push(...data.items);
    next = data.next;
  }
  return out;
}

export type SpotifyPlaylistDetail = SpotifyPlaylistSummary & {
  followers: { total: number };
};

export async function getPlaylist(id: string): Promise<SpotifyPlaylistDetail> {
  return spotifyJson<SpotifyPlaylistDetail>(`/playlists/${id}`);
}

// --- Search + track matching ---

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordOverlapScore(a: string, b: string): number {
  const wa = new Set(normalizeText(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / new Set([...wa, ...wb]).size;
}

// "Feat. X" / "& Y" / ", Z" in the artist string is noise for a search
// query — the first-listed artist is what actually drives a good match.
function primaryArtist(artist: string): string {
  return artist.split(/\bfeat\.?\b|\bft\.?\b|\bcon\b|,|&/i)[0].trim();
}

type RawSpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
};

function scoreTrack(track: RawSpotifyTrack, title: string, artist: string): number {
  const titleScore = wordOverlapScore(track.name, title);
  const artistNames = track.artists.map((a) => a.name).join(" ");
  const artistScore = wordOverlapScore(artistNames, artist);
  return titleScore * 0.65 + artistScore * 0.35;
}

export type SpotifyTrackMatch = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumImageUrl: string | null;
  score: number; // 0..1, not a Spotify field — our own title/artist overlap score
};

// Searches by title + artist (parsed from a Drive playlist doc, not
// necessarily a VPO artist — these are curated best-of lists that can
// include anyone's songs) and returns the best-scoring candidate, or null
// if nothing crosses a sane relevance bar. Tries a field-filtered query
// first (more precise when it works), falls back to a plain query if that
// comes up empty or weak.
export async function searchTrackByTitleArtist(title: string, artist: string): Promise<SpotifyTrackMatch | null> {
  const primary = primaryArtist(artist);
  const queries = [`track:${JSON.stringify(title)} artist:${JSON.stringify(primary)}`, `${title} ${primary}`];
  let best: { track: RawSpotifyTrack; score: number } | null = null;
  for (const q of queries) {
    const data = await spotifyJson<{ tracks: { items: RawSpotifyTrack[] } }>(
      `/search?type=track&limit=5&q=${encodeURIComponent(q)}`
    );
    for (const t of data.tracks?.items ?? []) {
      const score = scoreTrack(t, title, artist);
      if (!best || score > best.score) best = { track: t, score };
    }
    if (best && best.score > 0.75) break;
  }
  if (!best) return null;
  return {
    id: best.track.id,
    uri: best.track.uri,
    name: best.track.name,
    artists: best.track.artists.map((a) => a.name),
    albumImageUrl: best.track.album?.images?.[0]?.url ?? null,
    score: Math.round(best.score * 100) / 100,
  };
}

// --- Playlist write endpoints ---

export type SpotifyPlaylistCreated = { id: string; external_urls: { spotify: string } };

export async function createPlaylist(name: string, description: string, isPublic: boolean): Promise<SpotifyPlaylistCreated> {
  const conn = await getSpotifyConnection();
  if (!conn?.spotifyUserId) throw new Error("Spotify no está conectado todavía.");
  const res = await spotifyFetch(`/users/${conn.spotifyUserId}/playlists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, public: isPublic }),
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status} creando playlist: ${await res.text()}`);
  return res.json();
}

export async function updatePlaylistDetails(
  id: string,
  patch: { name?: string; description?: string; public?: boolean }
): Promise<void> {
  const res = await spotifyFetch(`/playlists/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status} actualizando playlist: ${await res.text()}`);
}

// body is the raw base64 JPEG string (no data: prefix) — Spotify requires
// Content-Type: image/jpeg with the base64 payload as the literal body.
export async function uploadPlaylistCoverImage(id: string, base64Jpeg: string): Promise<void> {
  const res = await spotifyFetch(`/playlists/${id}/images`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: base64Jpeg,
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status} subiendo portada: ${await res.text()}`);
}

// Spotify caps this endpoint at 100 URIs per call.
export async function addTracksToPlaylist(id: string, trackUris: string[]): Promise<void> {
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    const res = await spotifyFetch(`/playlists/${id}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: batch }),
    });
    if (!res.ok) throw new Error(`Spotify API error ${res.status} agregando tracks: ${await res.text()}`);
  }
}
