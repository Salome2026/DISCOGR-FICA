// Chartmetric integration.
//
// NOTE: the exact endpoint paths below (/api/token, /api/search, /api/artist/:id/stat/spotify)
// follow Chartmetric's publicly documented API v2 shape, but have not been exercised against a
// live account yet (access was pending approval at the time this was written). The first real
// call should be verified against https://api.chartmetric.com/apidoc and this file adjusted if
// any path/response shape differs — everything Chartmetric-specific is isolated here so that's a
// small, contained fix.

const CM_API = "https://api.chartmetric.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function chartmetricConfigured(): boolean {
  return !!process.env.CHARTMETRIC_REFRESH_TOKEN;
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.CHARTMETRIC_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("Falta CHARTMETRIC_REFRESH_TOKEN en las variables de entorno.");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${CM_API}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshtoken: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Chartmetric auth error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

async function cmFetch(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`${CM_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Chartmetric API error ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json();
}

export type ChartmetricArtistMatch = {
  chartmetricId: number;
  name: string;
  spotifyId: string | null;
};

export async function searchArtist(name: string): Promise<ChartmetricArtistMatch | null> {
  const data = await cmFetch(`/api/search?q=${encodeURIComponent(name)}&type=artists&limit=5`);
  const candidates = data?.obj?.artists ?? [];
  if (!candidates.length) return null;
  const exact = candidates.find(
    (a: { name?: string }) => a.name?.toLowerCase().trim() === name.toLowerCase().trim()
  );
  const pick = exact ?? candidates[0];
  return {
    chartmetricId: pick.id,
    name: pick.name,
    spotifyId: pick.sp_id ?? pick.spotify_id ?? null,
  };
}

export type ChartmetricStats = {
  monthlyListeners: number | null;
  followers: number | null;
};

export async function getArtistSpotifyStats(chartmetricId: number): Promise<ChartmetricStats> {
  const data = await cmFetch(`/api/artist/${chartmetricId}/stat/spotify`);
  const latest = Array.isArray(data?.obj) ? data.obj[data.obj.length - 1] : data?.obj;
  return {
    monthlyListeners: latest?.listeners ?? null,
    followers: latest?.followers ?? null,
  };
}
