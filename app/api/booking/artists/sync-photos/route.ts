import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { chartmetricConfigured, searchArtist, getArtistSpotifyStats } from "@/lib/chartmetric";
import { getArtist, slugify, updateArtistManagementFields } from "@/lib/db/artists";
import { listDistinctShowArtistNames } from "@/lib/db/booking";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Booking shows are full of DJ names with no row in `artists` and no photo —
// this looks each one up on Chartmetric and saves a photo, but ONLY on an
// exact (normalized) name match. Many of these are short/generic stage names
// ("TOTI", "Marilyn", "sofy") that Chartmetric's fuzzy search would happily
// match to a same-named artist on the other side of the world — better to
// leave the initials showing than to put a stranger's face on someone's show.
export async function POST() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!chartmetricConfigured()) {
    return NextResponse.json({ error: "Chartmetric no está configurado." }, { status: 400 });
  }

  const names = await listDistinctShowArtistNames();
  const seen = new Set<string>();
  const matched: string[] = [];
  const skipped: string[] = [];
  const notFound: string[] = [];

  for (const name of names) {
    const key = normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const id = slugify(name);
    const current = await getArtist(id);
    if (current?.photoUrl) {
      skipped.push(name);
      continue;
    }

    try {
      const match = await searchArtist(name);
      if (!match || normalize(match.name) !== key) {
        notFound.push(name);
        continue;
      }
      const stats = await getArtistSpotifyStats(match.chartmetricId);
      if (!stats.imageUrl) {
        notFound.push(name);
        continue;
      }
      await updateArtistManagementFields(id, name, { photoUrl: stats.imageUrl }, user.email);
      matched.push(name);
    } catch {
      notFound.push(name);
    }
  }

  return NextResponse.json({ matched, skipped, notFound });
}
