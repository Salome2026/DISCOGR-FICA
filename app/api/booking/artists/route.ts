import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listAllArtists } from "@/lib/db/artists";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await listAllArtists();
  return NextResponse.json({
    artists: artists.map((a) => ({ id: a.id, name: a.name, sello: a.sello, photoUrl: a.photoUrl })),
  });
}
