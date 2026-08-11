import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { spotifyConfigured, listMyPlaylists } from "@/lib/spotify";
import { listPlaylists, upsertPlaylistFromSpotify } from "@/lib/db/spotifyPlaylists";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const configured = await spotifyConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, playlists: [] });
  }

  try {
    const remote = await listMyPlaylists();
    for (const p of remote) {
      await upsertPlaylistFromSpotify({
        id: p.id,
        name: p.name,
        description: p.description,
        coverImageUrl: p.images?.[0]?.url ?? null,
        spotifyUrl: p.external_urls?.spotify ?? null,
        trackCount: p.tracks?.total ?? null,
      });
    }
  } catch (err) {
    console.error("Failed to refresh playlists from Spotify:", err);
    // Fall through to whatever's cached locally — a transient Spotify error
    // shouldn't make the whole panel go blank.
  }

  const playlists = await listPlaylists();
  return NextResponse.json({ configured: true, playlists });
}
