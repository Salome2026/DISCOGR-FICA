import { NextRequest, NextResponse } from "next/server";
import { seguimientoUser } from "../_auth";
import { updateUnit, type UnitPatch } from "@/lib/db/seguimiento";

function str(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await seguimientoUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const patch: UnitPatch = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if ("sello" in body) patch.sello = str(body.sello);
  if ("photoUrl" in body) patch.photoUrl = str(body.photoUrl);
  if ("info" in body) patch.info = str(body.info);
  if ("autoriaPropia" in body) {
    const n = body.autoriaPropia === null || body.autoriaPropia === "" ? null : Number(body.autoriaPropia);
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      return NextResponse.json({ error: "Temas de autoría propia inválido." }, { status: 400 });
    }
    patch.autoriaPropia = n === null ? null : Math.round(n);
  }
  if (Array.isArray(body.aliases)) {
    patch.aliases = body.aliases.map((a) => String(a).trim()).filter(Boolean);
  }
  if (typeof body.prioridad === "boolean") patch.prioridad = body.prioridad;
  if (typeof body.active === "boolean") patch.active = body.active;

  const unit = await updateUnit(id, patch, user.email);
  if (!unit) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ unit });
}
