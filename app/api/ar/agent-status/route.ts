import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAgentPersona, getAgentStatus } from "@/lib/db/arAgentSettings";

// Metadata inofensiva (nombre/tono/estado del agente, no el contenido real
// de oportunidades) — visible a cualquier usuario autenticado del lado
// empresa, no solo a quien tiene ver_ar/editar_ar. El widget flotante decide
// por su cuenta si además puede abrir el chat (eso sí gateado, ver
// app/api/ar/chat/route.ts).
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const [persona, status] = await Promise.all([getAgentPersona(), getAgentStatus()]);
  return NextResponse.json({ persona, status });
}
