import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listTracks } from "@/lib/db/catalog";
import { getArtistLatestByName, getArtistHistoryByName } from "@/lib/db/listeners";
import { assignSello } from "@/lib/sellos";

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nombre: string }> }
) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  if (!session?.user?.email || (!roles.includes("admin") && !roles.includes("management"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre } = await params;
  const artistName = decodeURIComponent(nombre);
  const key = norm(artistName);

  const [allTracks, latest, history] = await Promise.all([
    listTracks(),
    getArtistLatestByName(artistName),
    getArtistHistoryByName(artistName, 90),
  ]);

  const tracks = allTracks.filter((t) => t.participants.some((p) => norm(p) === key));
  const sello = latest?.sello ?? assignSello(artistName);

  return NextResponse.json({
    artist: artistName,
    sello,
    tracks,
    listeners: { latest, history },
  });
}
