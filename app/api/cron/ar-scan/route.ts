import { NextRequest, NextResponse } from "next/server";
import { scanLabelRosterGrowth } from "@/lib/arSignalScan";
import { scanCatalogRevivalOpportunities } from "@/lib/arCatalogRevival";
import { generateMarketSnapshot } from "@/lib/arMarketIntelligence";
import { geminiConfigured } from "@/lib/gemini";
import { withTimeout } from "@/lib/withTimeout";

export const maxDuration = 90;

// The cron scanLabelRosterGrowth()'s own doc-comment already anticipated
// ("a future scan-and-score cron can call this alongside Chartmetric/
// YouTube/... sources") — runs the roster-growth scan, then the
// catalog-revival scan (which benefits from any opportunities the first
// step just touched), then synthesizes the market snapshot from
// everything both scans + manual entries produced. Each step has its own
// try/catch so one failing step (e.g. Chartmetric down) doesn't stop the
// others — same ok/failed/errors accumulation pattern as sync-listeners.
// The Gemini step is wrapped in withTimeout() specifically — Gemini can
// hang, not just error, and a stuck market-snapshot generation must never
// stop the roster/catalog scan results (already done by that point) from
// being returned.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const steps: Record<string, unknown> = {};

  try {
    steps.rosterGrowth = await scanLabelRosterGrowth();
  } catch (err) {
    steps.rosterGrowth = { error: err instanceof Error ? err.message : String(err) };
  }

  try {
    steps.catalogRevival = await scanCatalogRevivalOpportunities();
  } catch (err) {
    steps.catalogRevival = { error: err instanceof Error ? err.message : String(err) };
  }

  if (geminiConfigured()) {
    try {
      const snapshot = await withTimeout(generateMarketSnapshot(null), 60_000);
      steps.marketSnapshot = snapshot
        ? { id: snapshot.id, generatedAt: snapshot.generatedAt }
        : { error: "Gemini no respondió a tiempo (60s) — se reintentará en la próxima corrida." };
    } catch (err) {
      steps.marketSnapshot = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    steps.marketSnapshot = { skipped: "GEMINI_API_KEY no configurado" };
  }

  return NextResponse.json({ status: "done", steps });
}
