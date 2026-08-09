import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getPlaylistById, approvePlaylist } from "@/lib/db/spotifyPlaylists";
import { updatePlaylistDetails } from "@/lib/spotify";

// Approving flips the playlist public on Spotify and marks it official
// locally — this is the gate the user asked for: nothing goes public
// without someone looking at name/cover/tracks first.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user || !hasPermission(user, "editar_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const playlist = await getPlaylistById(id);
  if (!playlist) {
    return NextResponse.json({ error: "Playlist no encontrada." }, { status: 404 });
  }

  await updatePlaylistDetails(id, { public: true });
  await approvePlaylist(id, user.email);

  return NextResponse.json({ ok: true });
}
