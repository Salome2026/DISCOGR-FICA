import { getRankingLatest } from "@/lib/db/listeners";
import { upsertAutoOpportunity, findOpenOpportunityBySubject } from "@/lib/db/arOpportunities";
import { computeScore } from "@/lib/arScoring";
import { crossReferenceArtist } from "@/lib/arCompatibility";
import { assignSello } from "@discografica/shared/sellos";

// A minimum real move, not noise — an artist has to actually be up at
// least 8% week-over-week to become a candidate. Below that, nothing gets
// created; there's no "score 0" spam.
const MIN_GROWTH_PCT = 0.08;

// Etapa 2a: the only signal source that needs zero new credentials —
// artist_listeners_daily is already populated by the existing
// sync-listeners cron. Reads it, never writes to it; this only writes to
// ar_opportunities. Deliberately its own function (not folded into
// sync-listeners) so a future scan-and-score cron (Etapa 2b) can call this
// alongside Chartmetric/YouTube/Apple Music sources without sync-listeners
// growing responsibilities it wasn't built for.
export async function scanLabelRosterGrowth(): Promise<{ scanned: number; created: number; updated: number }> {
  const ranking = await getRankingLatest();
  let created = 0;
  let updated = 0;

  for (const row of ranking) {
    const current = row.monthly_listeners;
    const previous = row.prev_7d;
    if (current == null || previous == null || previous <= 0) continue;
    const growthPct = (current - previous) / previous;
    if (growthPct < MIN_GROWTH_PCT) continue;

    const compatibility = await crossReferenceArtist(row.artist_name);
    const { score, breakdown, version } = computeScore({
      currentMetric: current,
      previousMetric: previous,
      sourceCount: 1, // Chartmetric only, in this sub-phase
      compatibility,
      createdAt: new Date().toISOString(), // freshness of a fresh scan — existing rows keep their own createdAt untouched
    });

    const sello = row.sello ?? assignSello(row.artist_name);
    const existingBefore = await findOpenOpportunityBySubject("artist_label", row.artist_id);

    await upsertAutoOpportunity({
      category: "ARTISTA EN CRECIMIENTO",
      title: `${row.artist_name} está creciendo ${Math.round(growthPct * 100)}% esta semana`,
      subjectType: "artist_label",
      subjectKey: row.artist_id,
      subjectName: row.artist_name,
      regionFocus: "AR",
      sourceType: "chartmetric_watchlist",
      opportunityScore: score,
      scoringVersion: version,
      scoreBreakdown: breakdown,
      metrics: {
        monthlyListeners: current,
        monthlyListenersPrev7d: previous,
        growthPct: Math.round(growthPct * 1000) / 10,
        followers: row.followers,
        measuredAt: row.measured_at,
      },
      compatibility,
      suggestedSello: sello,
      sources: [
        {
          type: "chartmetric",
          label: "Chartmetric — oyentes mensuales de Spotify",
          url: null,
          asOf: row.measured_at,
          note: null,
        },
      ],
    });

    if (existingBefore) updated++;
    else created++;
  }

  return { scanned: ranking.length, created, updated };
}
