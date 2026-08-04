import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listContracts, createContract, TIPOS_CONTRATO, ESTADOS_CONTRATO } from "@/lib/db/legalContracts";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const contracts = await listContracts();
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artist, sello, tipoContrato, fechaFirma, fechaVencimiento, estado, documentoUrl, documentoNombre, notas } = body as {
    artist?: string; sello?: string | null; tipoContrato?: string; fechaFirma?: string | null;
    fechaVencimiento?: string | null; estado?: string; documentoUrl?: string | null;
    documentoNombre?: string | null; notas?: string | null;
  };

  if (!artist || !artist.trim()) {
    return NextResponse.json({ error: "El artista es obligatorio." }, { status: 400 });
  }
  if (!tipoContrato || !TIPOS_CONTRATO.includes(tipoContrato as (typeof TIPOS_CONTRATO)[number])) {
    return NextResponse.json({ error: "Tipo de contrato inválido." }, { status: 400 });
  }
  if (!estado || !ESTADOS_CONTRATO.includes(estado as (typeof ESTADOS_CONTRATO)[number])) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const contract = await createContract({
    artist: artist.trim(),
    sello: sello || null,
    tipoContrato,
    fechaFirma: fechaFirma || null,
    fechaVencimiento: fechaVencimiento || null,
    estado,
    documentoUrl: documentoUrl || null,
    documentoNombre: documentoNombre || null,
    notas: notas || null,
    actorEmail: user.email,
  });

  return NextResponse.json({ contract });
}
