import { NextRequest, NextResponse } from "next/server";
import { getHojaByShareToken } from "@/lib/db/tourManager";

// Deliberately no auth check — this is the public, read-only link an
// artist/crew member opens without an account. The token itself (long,
// random, unguessable) is the access control; nothing here is discoverable
// by browsing, and archived hojas fall out of getHojaByShareToken already.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const hoja = await getHojaByShareToken(token);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}
