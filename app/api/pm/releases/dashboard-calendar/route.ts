import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/auth";
import { listReleasesFor } from "@/lib/db/releases";
import { ensureFonogramasSheetSchema } from "@/lib/db/fonogramasSheet";

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

  const pmReleases = await listReleasesFor(user.email, "admin");

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

  return NextResponse.json({ releases: [...pmReleases, ...sheetAsReleases] });
}
