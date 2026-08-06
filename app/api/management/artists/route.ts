import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getManagementArtistOverview } from "@/lib/db/managementArtists";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await getManagementArtistOverview();
  return NextResponse.json({ artists });
}
