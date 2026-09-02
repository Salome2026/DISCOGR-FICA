import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateReleaseEstado, setMarketingPlan, setSplitOverride, setReleaseLinks, archiveRelease, getReleaseOwner, getReleaseById, type EstadoRelease } from "@/lib/db/releases";
import { isValidYoutubeUrl } from "@/lib/youtubeLinkValidation";

const ESTADOS: EstadoRelease[] = ["Contactado", "Firmado", "Necesito ayuda"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json({ release });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const email = session?.user?.email;
  if (!email || roles.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  if (typeof body.marketingPlan === "boolean") {
    const groupId = body.groupId != null ? Number(body.groupId) : null;
    await setMarketingPlan(Number(id), groupId, body.marketingPlan, body.marketingPlanDetalle || null, email);
    return NextResponse.json({ ok: true });
  }

  if (typeof body.splitOverride === "boolean") {
    // Mismo alcance que crear_split_editorial (project_manager + admin) —
    // esta ruta ya solo la usan esos dos roles, así que alcanza con el
    // mismo chequeo de rol que el resto del archivo.
    if (!roles.includes("admin") && !roles.includes("project_manager")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await setSplitOverride(Number(id), body.splitOverride, email);
    return NextResponse.json({ ok: true });
  }

  if (typeof body.youtubeUrl === "string" || typeof body.driveAssetsUrl === "string") {
    const owner = await getReleaseOwner(Number(id));
    if (!owner) {
      return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
    }
    if (!roles.includes("admin") && owner.created_by !== email) {
      return NextResponse.json({ error: "No tenés acceso a este lanzamiento." }, { status: 403 });
    }
    const youtubeUrl = typeof body.youtubeUrl === "string" ? body.youtubeUrl.trim() : "";
    if (youtubeUrl && !isValidYoutubeUrl(youtubeUrl)) {
      return NextResponse.json({ error: "El link de YouTube no tiene un formato válido." }, { status: 400 });
    }
    await setReleaseLinks(
      Number(id),
      owner.group_id,
      youtubeUrl || null,
      typeof body.driveAssetsUrl === "string" ? body.driveAssetsUrl.trim() || null : null,
      email
    );
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
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const email = session?.user?.email;
  if (!email || roles.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const owner = await getReleaseOwner(Number(id));
  if (!owner) {
    return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  }
  if (!roles.includes("admin") && owner.created_by !== email) {
    return NextResponse.json(
      { error: "Solo podés eliminar los lanzamientos que vos cargaste." },
      { status: 403 }
    );
  }
  await archiveRelease(Number(id), owner.group_id, email);
  return NextResponse.json({ ok: true });
}
