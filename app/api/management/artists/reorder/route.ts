import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { reorderArtistChartPositions } from "@/lib/db/artists";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { order } = (await req.json()) as { order: { id: string; name: string; sello: string | null }[] };
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  await reorderArtistChartPositions(order, user.email);
  return NextResponse.json({ ok: true });
}
