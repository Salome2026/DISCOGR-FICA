import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTrack, updateTrackClassification } from "@/lib/db/catalog";
import { SELLOS } from "@/lib/sellos";
import { isActiveStreamingProjectName } from "@/lib/db/streamingProjects";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const track = await getTrack(id);
  if (!track) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ track });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const sello = body.sello === null || body.sello === "" ? null : String(body.sello);
  const streamingProject =
    body.streamingProject === null || body.streamingProject === undefined || body.streamingProject === ""
      ? null
      : String(body.streamingProject);

  if (sello !== null && !(SELLOS as readonly string[]).includes(sello)) {
    return NextResponse.json({ error: "Sello inválido." }, { status: 400 });
  }
  if (
    sello === "Streamings" &&
    streamingProject !== null &&
    !(await isActiveStreamingProjectName(streamingProject))
  ) {
    return NextResponse.json({ error: "Proyecto de streaming inválido." }, { status: 400 });
  }

  const track = await updateTrackClassification(id, { sello, streamingProject }, email);
  if (!track) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ track });
}
