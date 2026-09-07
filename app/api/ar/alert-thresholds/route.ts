import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAlertThresholds, setAlertThresholds, type ArAlertThresholds } from "@/lib/db/arAlerts";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const thresholds = await getAlertThresholds();
  return NextResponse.json({ thresholds });
}

function isValidNumber(v: unknown, min: number, max: number, integer: boolean): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const explodingGrowthPct = body?.explodingGrowthPct;
  const producerRepeatMinArtists = body?.producerRepeatMinArtists;
  const producerRepeatWindowDays = body?.producerRepeatWindowDays;
  const stalledMinDaysSinceRelease = body?.stalledMinDaysSinceRelease;

  if (
    !isValidNumber(explodingGrowthPct, 0.01, 5, false) ||
    !isValidNumber(producerRepeatMinArtists, 2, 20, true) ||
    !isValidNumber(producerRepeatWindowDays, 1, 3650, true) ||
    !isValidNumber(stalledMinDaysSinceRelease, 1, 3650, true)
  ) {
    return NextResponse.json({ error: "Umbrales inválidos." }, { status: 400 });
  }

  const thresholds: ArAlertThresholds = {
    explodingGrowthPct,
    producerRepeatMinArtists,
    producerRepeatWindowDays,
    stalledMinDaysSinceRelease,
  };
  const saved = await setAlertThresholds(thresholds);
  return NextResponse.json({ thresholds: saved });
}
