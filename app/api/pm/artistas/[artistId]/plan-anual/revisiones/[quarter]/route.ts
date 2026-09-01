import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { upsertQuarterlyReviewPm } from "@/lib/db/pmAnnualPlan";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ artistId: string; quarter: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId, quarter } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = await req.json();
  const { fecha, observacionesPm } = body as { fecha?: string | null; observacionesPm?: string | null };
  const review = await upsertQuarterlyReviewPm(artistId, quarter, { fecha, observacionesPm }, user.email);
  return NextResponse.json({ review });
}
