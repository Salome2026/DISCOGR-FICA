import { NextRequest, NextResponse } from "next/server";
import catalogo from "@/data/catalogo.json";
import { assignSello } from "@/lib/sellos";
import { chartmetricConfigured, searchArtist, getArtistSpotifyStats } from "@/lib/chartmetric";
import { upsertDailyRecord, startSyncRun, finishSyncRun } from "@/lib/db/listeners";

type ArtistEntry = { artist: string };
const catalogoData = catalogo as ArtistEntry[];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!chartmetricConfigured()) {
    return NextResponse.json(
      {
        status: "pending",
        message:
          "CHARTMETRIC_REFRESH_TOKEN no está configurado todavía — sync no ejecutado, no se escribió ningún dato.",
      },
      { status: 200 }
    );
  }

  const runId = await startSyncRun();
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  const measuredAt = today();

  for (const entry of catalogoData) {
    const artistName = entry.artist;
    if (!artistName || artistName === "Sin artista") continue;
    try {
      const match = await searchArtist(artistName);
      if (!match) {
        failed++;
        errors.push(`${artistName}: no encontrado en Chartmetric`);
        continue;
      }
      const stats = await getArtistSpotifyStats(match.chartmetricId);
      await upsertDailyRecord({
        artistId: String(match.chartmetricId),
        artistName,
        spotifyId: match.spotifyId,
        sello: assignSello(artistName),
        measuredAt,
        monthlyListeners: stats.monthlyListeners,
        followers: stats.followers,
        monthlyListenersRank: stats.monthlyListenersRank,
        artistRank: stats.artistRank,
        source: "chartmetric",
      });
      ok++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${artistName}: ${msg}`);
    }
  }

  await finishSyncRun(runId, ok, failed, errors.slice(0, 50).join(" | "));

  return NextResponse.json({ status: "done", ok, failed, errors: errors.slice(0, 20) });
}
