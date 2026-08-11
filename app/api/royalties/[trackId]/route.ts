import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSplitsForTrack, setSplitsForTrack, type PartyType } from "@/lib/db/royalties";
import { getTrack } from "@/lib/db/catalog";

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const user = await getSessionUser(req);
  if (!user?.email || user.role !== "admin") return null;
  return user.email;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const email = await requireAdmin(req);
  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { trackId } = await params;
  const track = await getTrack(trackId);
  if (!track) return NextResponse.json({ error: "Fonograma no encontrado" }, { status: 404 });

  const splits = await getSplitsForTrack(trackId);
  return NextResponse.json({ track, splits });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const email = await requireAdmin(req);
  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { trackId } = await params;
  const track = await getTrack(trackId);
  if (!track) return NextResponse.json({ error: "Fonograma no encontrado" }, { status: 404 });

  const body = await req.json();
  const rawSplits = Array.isArray(body.splits) ? body.splits : [];

  const splits: { partyType: PartyType; partyName: string; percentage: number }[] = [];
  for (const s of rawSplits) {
    const partyType = s.partyType === "sello" || s.partyType === "artista" ? s.partyType : null;
    const partyName = typeof s.partyName === "string" ? s.partyName.trim() : "";
    const percentage = Number(s.percentage);
    if (!partyType || !partyName || Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      return NextResponse.json(
        { error: "Cada reparto necesita tipo (sello/artista), nombre y un porcentaje entre 0 y 100." },
        { status: 400 }
      );
    }
    splits.push({ partyType, partyName, percentage });
  }

  const saved = await setSplitsForTrack(trackId, splits, email);
  return NextResponse.json({ splits: saved });
}
