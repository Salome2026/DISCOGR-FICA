import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listReleases } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const acuerdos = await listReleases();
    return NextResponse.json({ acuerdos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
