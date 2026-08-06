import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { updateContact, deleteContact } from "@/lib/db/booking";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nombre, apellido, venueNombre, telefono, whatsapp, instagram, email, observaciones, provincia, pais } = body as {
    nombre?: string;
    apellido?: string | null;
    venueNombre?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    email?: string | null;
    observaciones?: string | null;
    provincia?: string | null;
    pais?: string | null;
  };
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const contact = await updateContact(id, {
    nombre,
    apellido: apellido || null,
    venueNombre: venueNombre || null,
    telefono: telefono || null,
    whatsapp: whatsapp || null,
    instagram: instagram || null,
    email: email || null,
    observaciones: observaciones || null,
    provincia: provincia || null,
    pais: pais || null,
    createdBy: user.email,
  });
  if (!contact) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteContact(id);
  return NextResponse.json({ ok: true });
}
