import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listAllArtists, upsertArtist } from "@/lib/db/artists";
import { SELLOS } from "@/lib/sellos";

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const user = await getSessionUser(req);
  if (!user?.email || user.role !== "admin") return null;
  return user.email;
}

export async function GET(req: NextRequest) {
  const email = await requireAdmin(req);
  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const artists = await listAllArtists();
  return NextResponse.json({ artists });
}

export async function POST(req: NextRequest) {
  const email = await requireAdmin(req);
  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, name, aliases, sello, instagram, tiktok, youtube, spotify, chartmetricId } = body as {
    id?: string; name?: string; aliases?: string; sello?: string | null;
    instagram?: string; tiktok?: string; youtube?: string; spotify?: string;
    chartmetricId?: string | number | null;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (sello && !SELLOS.includes(sello as (typeof SELLOS)[number])) {
    return NextResponse.json({ error: "Sello inválido." }, { status: 400 });
  }

  const artist = await upsertArtist({
    id,
    name: name.trim(),
    aliases: (aliases || "").split(",").map((a) => a.trim()).filter(Boolean),
    sello: (sello as (typeof SELLOS)[number] | null) || null,
    instagram: instagram?.trim() || null,
    tiktok: tiktok?.trim() || null,
    youtube: youtube?.trim() || null,
    spotify: spotify?.trim() || null,
    chartmetricId: chartmetricId ? Number(chartmetricId) || null : null,
    actorEmail: email,
  });

  return NextResponse.json({ artist });
}
