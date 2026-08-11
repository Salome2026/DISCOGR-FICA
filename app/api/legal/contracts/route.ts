import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/session";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listContracts, createContract, TIPOS_CONTRATO, ESTADOS_CONTRATO } from "@/lib/db/legalContracts";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

// GET accepts either the web cookie session or a mobile Bearer token — the
// mobile Legal module is read-only for now (viewer only), so POST/PATCH/
// DELETE stay cookie-only until mobile actually needs to write.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
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
  const { artist, sello, tipoContrato, contraparte, codigoInterno, firmantes, fonograma, fechaFirma, fechaVencimiento, estado, documentoUrl, documentoNombre, notas } = body as {
    artist?: string; sello?: string | null; tipoContrato?: string; contraparte?: string | null;
    codigoInterno?: string | null; firmantes?: string | null; fonograma?: string | null;
    fechaFirma?: string | null; fechaVencimiento?: string | null;
    estado?: string; documentoUrl?: string | null; documentoNombre?: string | null; notas?: string | null;
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
    contraparte: contraparte || null,
    codigoInterno: codigoInterno || null,
    firmantes: firmantes || null,
    fonograma: fonograma || null,
    fechaFirma: fechaFirma || null,
    fechaVencimiento: fechaVencimiento || null,
    estado,
    documentoUrl: documentoUrl || null,
    documentoNombre: documentoNombre || null,
    notas: notas || null,
    docusignEnvelopeId: null,
    actorEmail: user.email,
  });

  return NextResponse.json({ contract });
}
