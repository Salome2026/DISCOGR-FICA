import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReleaseById } from "@/lib/db/releases";
import { linkReleaseRequestToRelease } from "@/lib/db/legalReleaseRequests";

// Vincula un Release cargado a mano (sin fonograma todavía) al fonograma
// real recién creado — mismo gate de ownership que el resto de
// app/api/pm/releases/[id]/**.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const email = session?.user?.email;
  if (!email || roles.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const release = await getReleaseById(Number(id));
  if (!release) {
    return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  }
  if (!roles.includes("admin") && release.created_by !== email) {
    return NextResponse.json({ error: "No tenés acceso a este lanzamiento." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.releaseRequestId !== "string" || !body.releaseRequestId) {
    return NextResponse.json({ error: "Falta releaseRequestId." }, { status: 400 });
  }
  const linked = await linkReleaseRequestToRelease(body.releaseRequestId, Number(id), email);
  if (!linked) {
    return NextResponse.json({ error: "Ese Release ya no está disponible para vincular." }, { status: 409 });
  }
  return NextResponse.json({ request: linked });
}
