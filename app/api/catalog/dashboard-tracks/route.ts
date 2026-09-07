import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSessionUser } from "@/lib/session";
import { listTracks } from "@/lib/db/catalog";
import { ensureFonogramasSheetSchema } from "@/lib/db/fonogramasSheet";
import { normalizeName } from "@/lib/participants";

// Same reasoning as /api/pm/releases/dashboard-calendar: the dashboard's
// donut ("Distribución por discográfica") and derived artist counts were
// only reading catalog_tracks, so every fonograma that only exists in the
// synced "Fonogramas MAWZ & INDYANA" sheet was invisible to that total.
// This merges both into the exact shape the dashboard already expects —
// /api/catalog/tracks itself stays untouched since /catalogo and the sello
// pages rely on its filters (sello/project/unassigned) which don't apply
// to sheet rows.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.includes("admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const catalogTracks = await listTracks();

  await ensureFonogramasSheetSchema();
  const { rows: sheetRows } = await sql`SELECT * FROM sheet_fonogramas`;

  // The sheet's "provider" column uses lowercase short-codes (confirmed:
  // fuga, ada, dashgo, onerpm, orchard, soundon — nothing else) while
  // catalog_tracks.company uses the label the donut already displays —
  // mapped here so a distributor isn't split into two lookalike slices
  // just because the two sources spell it differently.
  const PROVIDER_LABELS: Record<string, string> = {
    fuga: "FUGA",
    ada: "ADA",
    dashgo: "DashGo",
    onerpm: "ONErpm",
    orchard: "The Orchard",
    soundon: "SoundOn",
  };

  // Dedup against catalog_tracks: the same phonogram loaded via the PM
  // release form (or the "ogs" catalog import) is often ALSO present in the
  // synced "Fonogramas MAWZ & INDYANA" sheet — without this, every one of
  // those overlapping rows counted twice, inflating the donut total by
  // ~965 phonograms. Matched by ISRC first (populated on effectively every
  // sheet row and all but a handful of catalog_tracks rows); falls back to
  // normalized artist+track for the few catalog_tracks rows with no ISRC.
  const catalogIsrcs = new Set(
    catalogTracks.map((t) => t.isrc?.trim().toUpperCase()).filter((v): v is string => !!v)
  );
  const catalogNameKeys = new Set(
    catalogTracks.map((t) => `${normalizeName(t.artist_display)}|${normalizeName(t.track)}`)
  );

  const sheetAsTracks = sheetRows
    .filter((r) => {
      const isrc = (r.isrc as string | null)?.trim().toUpperCase();
      if (isrc && catalogIsrcs.has(isrc)) return false;
      const key = `${normalizeName((r.track_artist as string) ?? "")}|${normalizeName(r.track as string)}`;
      return !catalogNameKeys.has(key);
    })
    .map((r) => {
      const provider = (r.provider as string | null) ?? null;
      return {
        id: `sheet-${r.seq}`,
        isrc: (r.isrc as string | null) ?? null,
        track: r.track as string,
        album: (r.album as string | null) ?? null,
        release_date: r.release_date as string | null,
        upc: (r.upc as string | null) ?? null,
        company: provider ? (PROVIDER_LABELS[provider.toLowerCase()] ?? provider) : null,
        artist_display: r.track_artist as string,
      };
    });

  return NextResponse.json({ tracks: [...catalogTracks, ...sheetAsTracks] });
}
