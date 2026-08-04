import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listReleases } from "@/lib/notion";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role === "sin_acceso" || !role) {
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
