import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getLatestMarketSnapshot } from "@/lib/db/arMarketSnapshots";
import { generateMarketSnapshot } from "@/lib/arMarketIntelligence";
import { geminiConfigured } from "@/lib/gemini";
import { withTimeout } from "@/lib/withTimeout";

export const maxDuration = 90;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const snapshot = await getLatestMarketSnapshot("combined");
  return NextResponse.json({ snapshot });
}

// Manual "Actualizar ahora" trigger — the daily cron (/api/cron/ar-scan)
// calls generateMarketSnapshot() the same way.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "GEMINI_API_KEY no está configurado todavía." }, { status: 400 });
  }
  try {
    const snapshot = await withTimeout(generateMarketSnapshot(user.email), 60_000);
    if (!snapshot) {
      return NextResponse.json({ error: "Gemini no respondió a tiempo (60s) — probá de nuevo en un rato." }, { status: 504 });
    }
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el resumen." },
      { status: 500 }
    );
  }
}
