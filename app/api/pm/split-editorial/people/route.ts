import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { searchPublishingArtists } from "@/lib/db/publishingArtists";

// A PM searching for a person here gets the fields needed to auto-fill a
// split entry (nombre completo, apellido, DNI, fecha de nacimiento, SADAIC,
// IPI, domicilio, email) when they pick someone already on file — this is a
// deliberate exception to the general rule that PMs don't have ver_publishing:
// the fuller Publishing ficha (observaciones, documento adjunto, teléfono,
// nacionalidad, sello, tipo) still stays out of this response.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_split_editorial")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const people = await searchPublishingArtists(q);
  return NextResponse.json({
    people: people.map((p) => ({
      id: p.id,
      nombreArtistico: p.nombreArtistico,
      nombreCompleto: p.nombreCompleto,
      apellido: p.apellido,
      dni: p.dni,
      fechaNacimiento: p.fechaNacimiento,
      sadaic: p.sadaic,
      ipi: p.ipi,
      direccion: p.direccion,
      email: p.email,
    })),
  });
}
