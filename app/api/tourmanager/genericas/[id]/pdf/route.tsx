import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getHojaGenerica } from "@/lib/db/tourManagerGenericas";
import HojaGenericaDoc from "@/lib/pdf/HojaGenericaDoc";

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "hoja-generica";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const hoja = await getHojaGenerica(id);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  try {
    const buffer = await renderToBuffer(<HojaGenericaDoc hoja={hoja} />);
    const filename = `Hoja-Generica-${sanitizeFilename(hoja.artistName)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando hoja genérica PDF:", err);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
