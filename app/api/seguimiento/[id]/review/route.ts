import { NextRequest, NextResponse } from "next/server";
import { seguimientoUser } from "../../_auth";
import { addReview, listReviews, ESTADOS_SEGUIMIENTO, type EstadoSeguimiento } from "@/lib/db/seguimiento";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await seguimientoUser(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const reviews = await listReviews(id);
  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await seguimientoUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { estado?: string; foco?: string; proximoPaso?: string; nota?: string };
  if (!ESTADOS_SEGUIMIENTO.includes(body.estado as EstadoSeguimiento)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const unit = await addReview(
    id,
    {
      estado: body.estado as EstadoSeguimiento,
      foco: clean(body.foco),
      proximoPaso: clean(body.proximoPaso),
      nota: clean(body.nota),
    },
    user.email
  );
  if (!unit) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ unit });
}
