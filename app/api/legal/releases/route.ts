import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listTracks } from "@/lib/db/catalog";

// Read-only view of the catalog for the Legal module — deliberately separate
// from /api/catalog/tracks (admin-only) so Legal's access doesn't depend on
// or share that endpoint's gate.
export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tracks = await listTracks();
  return NextResponse.json({ tracks });
}
