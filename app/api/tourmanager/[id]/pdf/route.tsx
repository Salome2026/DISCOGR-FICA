import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getHoja } from "@/lib/db/tourManager";
import { getArtist } from "@/lib/db/artists";
import HojaDeRutaDoc from "@/lib/pdf/HojaDeRutaDoc";

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "hoja-de-ruta";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const hoja = await getHoja(id);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const artist = hoja.artistId ? await getArtist(hoja.artistId).catch(() => null) : null;

  try {
    const buffer = await renderToBuffer(<HojaDeRutaDoc hoja={hoja} artistPhotoUrl={artist?.photoUrl ?? null} />);
    const filename = `Hoja-de-Ruta-${sanitizeFilename(hoja.artistName)}-${hoja.fecha}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando hoja de ruta PDF:", err);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
