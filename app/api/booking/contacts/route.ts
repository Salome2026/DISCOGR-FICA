import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listContacts, createContact } from "@/lib/db/booking";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const contacts = await listContacts();
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const { nombre, apellido, venueNombre, telefono, whatsapp, instagram, email, observaciones } = body as {
    nombre?: string;
    apellido?: string | null;
    venueNombre?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    email?: string | null;
    observaciones?: string | null;
  };
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const contact = await createContact({
    nombre,
    apellido: apellido || null,
    venueNombre: venueNombre || null,
    telefono: telefono || null,
    whatsapp: whatsapp || null,
    instagram: instagram || null,
    email: email || null,
    observaciones: observaciones || null,
    createdBy: user.email,
  });
  return NextResponse.json({ contact });
}
