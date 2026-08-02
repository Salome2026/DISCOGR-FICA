import { NextRequest, NextResponse } from "next/server";
import { createRelease, listReleases } from "@/lib/notion";

export async function GET() {
  try {
    const releases = await listReleases();
    return NextResponse.json({ releases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del acuerdo es obligatorio." },
        { status: 400 }
      );
    }

    const page = await createRelease({
      nombre,
      compania: body.compania,
      prioridad: body.prioridad,
      comentario: body.comentario,
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
