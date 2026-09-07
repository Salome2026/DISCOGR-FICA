import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { setAgentPersona } from "@/lib/db/arAgentSettings";

// Configurar la persona del agente — admin + rol ar (editar_ar), no PM (que
// solo tiene ver_ar) — mismo alcance que el chat en sí.
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const { name, avatarUrl, tone, description } = (body ?? {}) as {
    name?: string; avatarUrl?: string | null; tone?: string; description?: string;
  };
  if (!name?.trim() || !tone?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Faltan nombre, tono o descripción." }, { status: 400 });
  }
  const persona = await setAgentPersona(
    { name: name.trim(), avatarUrl: avatarUrl?.trim() || null, tone: tone.trim(), description: description.trim() },
    user.email
  );
  return NextResponse.json({ persona });
}
