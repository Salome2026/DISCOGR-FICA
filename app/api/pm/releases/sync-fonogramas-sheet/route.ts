import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncFonogramasSheet } from "@/lib/fonogramasSheetSync";

export async function POST(_req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await syncFonogramasSheet();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
