import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listTracks } from "@/lib/db/catalog";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unassigned = searchParams.get("unassigned");
  const sello = searchParams.get("sello");
  const project = searchParams.get("project");

  const tracks = await listTracks(
    project
      ? { streamingProject: project }
      : unassigned === "1"
      ? { sello: null }
      : sello
      ? { sello }
      : undefined
  );
  return NextResponse.json({ tracks });
}
