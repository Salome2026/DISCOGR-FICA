import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getScoutingCriteria, setScoutingCriteria } from "@/lib/db/arScoutingSettings";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const criteria = await getScoutingCriteria();
  return NextResponse.json({ criteria });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "El documento de criterios no puede quedar vacío." }, { status: 400 });
  }
  const criteria = await setScoutingCriteria(text, user.email);
  return NextResponse.json({ criteria });
}
