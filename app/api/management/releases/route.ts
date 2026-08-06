import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getManagementReleaseEvents } from "@/lib/db/managementReleases";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const releases = await getManagementReleaseEvents();
  return NextResponse.json({ releases });
}
