import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createAccount, listAllAccounts, listAccountsForCm } from "@/lib/db/cmAccounts";
import { slugify } from "@/lib/db/artists";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const accounts = user.roles.includes("admin") || user.roles.includes("management")
    ? await listAllAccounts()
    : await listAccountsForCm(user.email);
  return NextResponse.json({ accounts });
}

// Alta de cuenta — Management/admin (mismo criterio que las demás pantallas
// de alta de este proyecto: quien administra el módulo, no la CM).
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  // hasPermission ya cubre admin (ROLE_PERMISSIONS.admin = ALL incluye
  // editar_management), no hace falta un chequeo de rol aparte.
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";
  if (!name || !platform) {
    return NextResponse.json({ error: "Faltan campos obligatorios: nombre y plataforma." }, { status: 400 });
  }
  const id = `${slugify(name)}-${slugify(platform)}`;
  const account = await createAccount({
    id,
    name,
    platform,
    handle: typeof body?.handle === "string" ? body.handle.trim() || null : null,
    url: typeof body?.url === "string" ? body.url.trim() || null : null,
    linkedArtistId: typeof body?.linkedArtistId === "string" ? body.linkedArtistId.trim() || null : null,
    sello: typeof body?.sello === "string" ? body.sello.trim() || null : null,
    frecuenciaPublicacionAcordada: typeof body?.frecuenciaPublicacionAcordada === "string" ? body.frecuenciaPublicacionAcordada.trim() || null : null,
    createdBy: user.email,
  });
  return NextResponse.json({ account }, { status: 201 });
}
