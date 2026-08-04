// Chartmetric integration.
//
// Verified against a live account (2026-08-04). /api/token and /api/search work as originally
// written. getArtistSpotifyStats originally called /api/artist/:id/stat/spotify with no `field`
// param — that endpoint requires one and 400s without it, so this always failed. It now reads
// /api/artist/:id instead: a single call that returns cm_statistics with the current snapshot of
// monthly listeners, followers, and — usefully — Chartmetric's own global rank for each, which
// the old stat/spotify endpoint never exposed at all.

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
  monthlyListenersRank: number | null;
  artistRank: number | null;
  imageUrl: string | null;
  topCities: { name: string; countryCode: string; listeners: number }[];
  homeCountry: string | null;
};

export async function getArtistSpotifyStats(chartmetricId: number): Promise<ChartmetricStats> {
  const data = await cmFetch(`/api/artist/${chartmetricId}`);
  const stats = data?.obj?.cm_statistics ?? {};
  const cities = Array.isArray(stats.sp_where_people_listen) ? stats.sp_where_people_listen : [];
  return {
    monthlyListeners: stats.sp_monthly_listeners ?? null,
    followers: stats.sp_followers ?? null,
    monthlyListenersRank: stats.sp_monthly_listeners_rank ?? null,
    artistRank: stats.cm_artist_rank ?? null,
    imageUrl: data?.obj?.image_url ?? null,
    topCities: cities
      .slice(0, 5)
      .map((c: { name: string; code2: string; listeners: number }) => ({
        name: c.name,
        countryCode: c.code2,
        listeners: c.listeners,
      })),
    homeCountry: stats.countryRank?.country ?? null,
  };
}
