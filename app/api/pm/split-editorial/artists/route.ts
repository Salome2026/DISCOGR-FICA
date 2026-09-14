import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { ensureArtistExists, slugify } from "@/lib/db/artists";

// Registra un artista nuevo en el roster (idempotente) cuando el PM lo
// carga a mano en Split editorial o Release y no matcheó ninguno existente
// — mismo mecanismo (ensureArtistExists) que ya usa la asignación de
// artistas a PM, expuesto acá porque un project_manager no tiene acceso al
// alta de artistas de admin (/api/artists).
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !(hasPermission(user, "crear_split_editorial") || hasPermission(user, "crear_release_legal"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { name } = (await req.json()) as { name?: string };
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Falta el nombre del artista." }, { status: 400 });
  }

  await ensureArtistExists(slugify(trimmed), trimmed, user.email);
  return NextResponse.json({ ok: true });
}
