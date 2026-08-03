import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateReleaseEstado, setMarketingPlan, archiveRelease, getReleaseOwner, type EstadoRelease } from "@/lib/db/releases";

const ESTADOS: EstadoRelease[] = ["Contactado", "Firmado", "Necesito ayuda"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  if (typeof body.marketingPlan === "boolean") {
    const groupId = body.groupId != null ? Number(body.groupId) : null;
    await setMarketingPlan(Number(id), groupId, body.marketingPlan, body.marketingPlanDetalle || null, email);
    return NextResponse.json({ ok: true });
  }

  if (!ESTADOS.includes(body.estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  await updateReleaseEstado(Number(id), body.estado, email);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const owner = await getReleaseOwner(Number(id));
  if (!owner) {
    return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  }
  if (role !== "admin" && owner.created_by !== email) {
    return NextResponse.json(
      { error: "Solo podés eliminar los lanzamientos que vos cargaste." },
      { status: 403 }
    );
  }
  await archiveRelease(Number(id), owner.group_id, email);
  return NextResponse.json({ ok: true });
}
