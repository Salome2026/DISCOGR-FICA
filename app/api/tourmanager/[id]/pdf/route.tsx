import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getHoja } from "@/lib/db/tourManager";
import { getArtist } from "@/lib/db/artists";
import { buildStaticMapPng } from "@/lib/staticMap";
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

  const hasOrigen = hoja.origenLat != null && hoja.origenLng != null;
  const hasVenue = hoja.venueLat != null && hoja.venueLng != null;
  const mapPng =
    hasOrigen || hasVenue
      ? await buildStaticMapPng({
          origin: hasOrigen ? { lat: hoja.origenLat as number, lng: hoja.origenLng as number } : null,
          venue: hasVenue ? { lat: hoja.venueLat as number, lng: hoja.venueLng as number } : null,
          routeGeojson: hoja.rutaIdaGeojson,
        })
      : null;
  const mapImageDataUri = mapPng ? `data:image/png;base64,${mapPng.toString("base64")}` : null;

  try {
    const buffer = await renderToBuffer(
      <HojaDeRutaDoc hoja={hoja} artistPhotoUrl={artist?.photoUrl ?? null} mapImageDataUri={mapImageDataUri} />
    );
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
