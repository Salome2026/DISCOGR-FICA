import { NextResponse } from "next/server";
import { listReleases } from "@/lib/notion";

export async function GET() {
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
