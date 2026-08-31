import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSessionUser } from "@/lib/session";
import { listAllReleases } from "@/lib/db/releases";
import { ensureFonogramasSheetSchema } from "@/lib/db/fonogramasSheet";
import { getArtistImagesByNames } from "@/lib/db/listeners";

// Merges the PM-created pipeline (pm_releases, task-tracked, editable) with
// the external "Fonogramas MAWZ & INDYANA" sheet (read-only catalog synced
// via /api/pm/releases/sync-fonogramas-sheet) into one feed — shared by every
// read-only ReleaseCalendar embed (Dashboard, Publishing, Legal) so they all
// show the same complete calendar. Deliberately global for every role,
// including project_manager — PMs need to see the full label calendar to
// spot cross-artist conflicts, independent of which artists are assigned to
// them (that scoping only applies to editing, not to this read-only view).
// PM's own task-management board never uses this route — it hits the plain
// /api/pm/releases feed (own-only), since sheet rows have no real pm_releases
// id to attach a Release/Split task to.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pmReleases = (await listAllReleases()) as { artist_name: string }[];

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
