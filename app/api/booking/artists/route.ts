import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listAllArtists, slugify, updateArtistManagementFields } from "@/lib/db/artists";
import { listDistinctShowArtistNames } from "@/lib/db/booking";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await listAllArtists();
  const known = new Set(artists.map((a) => normalize(a.name)));

  // Booking shows (mostly sheet-imported) name plenty of DJs/performers with
  // no row anywhere in `artists` — surface them too, so they're pickable in
  // the artist agenda and eligible for a photo, not just the label roster.
  // The sheet spells some names inconsistently ("gusty" / "Gusty") — since
  // both slugify to the same id, collapse to one entry per normalized name
  // or the merged list would offer two options that silently fight over the
  // same photo.
  const seen = new Set<string>();
  const showOnlyNames: string[] = [];
  for (const n of await listDistinctShowArtistNames()) {
    const key = normalize(n);
    if (known.has(key) || seen.has(key)) continue;
    seen.add(key);
    showOnlyNames.push(n);
  }

  const merged = [
    ...artists.map((a) => ({ id: a.id, name: a.name, sello: a.sello, photoUrl: a.photoUrl })),
    ...showOnlyNames.map((n) => ({ id: slugify(n), name: n, sello: null as string | null, photoUrl: null as string | null })),
  ];
  return NextResponse.json({ artists: merged });
}

// Sets a booking artist's photo — reuses the same artists.photo_url column
// (and upsert-a-minimal-row-if-needed behavior) Management already curates,
// so there's one photo per artist name across both modules, never a duplicate.
export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { name, photoUrl } = (await req.json()) as { name?: string; photoUrl?: string | null };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Falta el nombre del artista." }, { status: 400 });
  }
  const artist = await updateArtistManagementFields(slugify(name), name, { photoUrl: photoUrl || null }, user.email);
  return NextResponse.json({ artist });
}
