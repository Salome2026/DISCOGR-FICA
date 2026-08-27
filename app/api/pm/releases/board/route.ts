import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listReleasesForBoard } from "@/lib/db/releases";
import { deriveTaskStatuses, type BoardRow } from "@/lib/pmTaskStatus";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rows = await listReleasesForBoard(user.email, user.role);
  const releases = rows.map((r) => ({ ...r, ...deriveTaskStatuses(r as unknown as BoardRow) }));
  return NextResponse.json({ releases });
}
