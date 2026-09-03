import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist, getAssignment } from "@/lib/db/pmArtistAssignments";
import { getArtist, updateArtistManagementFields } from "@/lib/db/artists";

// Distinct from PATCH /api/pm/artistas/[artistId] (which writes
// pm_roster_assignments.photo_url — only meant for non-artist "units" with
// no artists row). This writes artists.photo_url directly, same column
// Management's upload edits, so the photo shows up everywhere getArtist()/
// listAllArtists() is read, not just on this one page.
export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/png", "image/jpeg"],
        maximumSizeInBytes: 20 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ uploadedBy: user.email }),
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al generar el token de subida." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.photoUrl !== "string" && body?.photoUrl !== null) {
    return NextResponse.json({ error: "Falta photoUrl." }, { status: 400 });
  }
  const [current, assignment] = await Promise.all([getArtist(artistId), getAssignment(artistId)]);
  const name = current?.name ?? assignment?.artistName;
  if (!name) {
    return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });
  }
  const artist = await updateArtistManagementFields(artistId, name, { photoUrl: body.photoUrl?.trim() || null }, user.email);
  return NextResponse.json({ artist });
}
