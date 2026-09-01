import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/session";
import { canViewAnnualPlan, getAssignment } from "@/lib/db/pmArtistAssignments";
import { getAnnualPlan, listLaunches, listActions, listQuarterlyReviews } from "@/lib/db/pmAnnualPlan";
import { getArtist } from "@/lib/db/artists";
import { getUserByEmail } from "@/lib/db/users";
import PlanAnualDoc from "@/lib/pdf/PlanAnualDoc";

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "plan-anual";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canViewAnnualPlan(user, artistId))) {
    return NextResponse.json({ error: "No tenés acceso a este artista." }, { status: 403 });
  }

  const artist = await getArtist(artistId);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });

  const [plan, launches, actions, quarterlyReviews, assignment] = await Promise.all([
    getAnnualPlan(artistId),
    listLaunches(artistId),
    listActions(artistId),
    listQuarterlyReviews(artistId),
    getAssignment(artistId),
  ]);
  const pm = assignment ? await getUserByEmail(assignment.pmEmail) : null;
  const pmName = pm?.name ?? assignment?.pmEmail ?? "Sin asignar";

  try {
    const buffer = await renderToBuffer(
      <PlanAnualDoc
        artistName={artist.name}
        artistPhotoUrl={artist.photoUrl}
        pmName={pmName}
        plan={plan}
        launches={launches}
        actions={actions}
        quarterlyReviews={quarterlyReviews}
      />
    );
    const filename = `Plan-Anual-${sanitizeFilename(artist.name)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando el PDF del plan anual:", err);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
