import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateReleaseEstado, setMarketingPlan, archiveRelease, type EstadoRelease } from "@/lib/db/releases";

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
  if (role !== "admin" || !email) {
    return NextResponse.json(
      { error: "Solo un administrador puede archivar lanzamientos." },
      { status: 403 }
    );
  }
  const { id } = await params;
  await archiveRelease(Number(id), email);
  return NextResponse.json({ ok: true });
}
