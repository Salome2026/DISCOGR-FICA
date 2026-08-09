import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listPendingReview } from "@/lib/db/spotifyPlaylists";
import { listTracksForPlaylist } from "@/lib/db/spotifyPlaylistTracks";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user || !hasPermission(user, "ver_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pending = await listPendingReview();
  const withTracks = await Promise.all(
    pending.map(async (p) => ({
      ...p,
      tracks: await listTracksForPlaylist(p.id),
    }))
  );
  return NextResponse.json({ playlists: withTracks });
}
