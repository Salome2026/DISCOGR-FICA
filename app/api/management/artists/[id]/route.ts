import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { updateArtistManagementFields } from "@/lib/db/artists";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, photoUrl, chartPosition, estadoGeneral, genero } = body as {
    name?: string;
    photoUrl?: string | null;
    chartPosition?: number | null;
    estadoGeneral?: string | null;
    genero?: string | null;
  };
  if (!name) {
    return NextResponse.json({ error: "Falta el nombre del artista." }, { status: 400 });
  }

  const artist = await updateArtistManagementFields(id, name, { photoUrl, chartPosition, estadoGeneral, genero }, user.email);
  return NextResponse.json({ artist });
}
