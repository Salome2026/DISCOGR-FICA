import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/auth";
import { listReleasesFor } from "@/lib/db/releases";
import { ensureFonogramasSheetSchema } from "@/lib/db/fonogramasSheet";
import { getArtistImagesByNames } from "@/lib/db/listeners";

// Merges the PM-created pipeline (pm_releases, task-tracked, editable) with
// the external "Fonogramas MAWZ & INDYANA" sheet (read-only catalog synced
// via /api/pm/releases/sync-fonogramas-sheet) into one feed for the
// dashboard's calendar — the only consumer that needs both. Every other
// ReleaseCalendar embed (Legal, PM's own board) keeps hitting the plain
// /api/pm/releases feed unchanged.
export async function GET(_req: NextRequest) {
  const session = await auth();
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pmReleases = (await listReleasesFor(user.email, "admin")) as { artist_name: string }[];

  await ensureFonogramasSheetSchema();
  const { rows: sheetRows } = await sql`
    SELECT * FROM sheet_fonogramas WHERE release_date IS NOT NULL
  `;

  const sheetAsReleases = sheetRows.map((r) => ({
    id: 1_000_000_000 + Number(r.seq),
    artist_name: r.track_artist as string,
    sello: (r.sello as string | null) ?? null,
    fonograma_nombre: r.track as string,
    estado: "Publicado",
    distribuidora: (r.provider as string | null) ?? null,
    fecha_lanzamiento: r.release_date,
    hora_lanzamiento: null,
    colaboradores: null,
    group_id: null,
    group_tipo: null,
    group_nombre: null,
    marketing_plan: false,
    marketing_plan_detalle: null,
    portada_url: null,
    source: "sheet" as const,
  }));

  // Spotify profile photo per artist, for the calendar chip avatar — reuses
  // the same Chartmetric-synced images already shown in "Ranking de
  // artistas" instead of a second image source. A sheet row's artist_name
  // is sometimes several names joined with "|" straight from the sheet cell
  // (a real quirk of that source, not something this pipeline should try to
  // clean up) — those simply won't match and fall back to no avatar.
  const allNames = [...pmReleases, ...sheetAsReleases].map((r) => r.artist_name as string).filter(Boolean);
  const images = await getArtistImagesByNames(allNames);
  const withImage = <T extends { artist_name: string }>(r: T) => ({
    ...r,
    image_url: images.get(r.artist_name.trim().toLowerCase()) ?? null,
  });

  return NextResponse.json({ releases: [...pmReleases.map(withImage), ...sheetAsReleases.map(withImage)] });
}
