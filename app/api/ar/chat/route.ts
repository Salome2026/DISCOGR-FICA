import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAgentPersona } from "@/lib/db/arAgentSettings";
import { listRecentTurns, appendTurn, ARCHAT_HISTORY_LIMIT, type ArChatTurn } from "@/lib/db/arChat";
import { getOpportunities } from "@/lib/db/arOpportunities";
import { chatWithAgent } from "@/lib/arChat";
import { geminiConfigured } from "@/lib/gemini";
import { raceTimeout, TimeoutError } from "@/lib/withTimeout";

export const maxDuration = 60;

// Resuelve los ids referenciados de un lote de turnos con una sola consulta
// batched, en vez de un getOpportunity() por id — reusado por GET y POST
// para no mantener la misma lógica duplicada en los dos.
async function attachReferences<T extends { referencedOpportunityIds: string[] }>(
  turns: T[]
): Promise<(Omit<T, "referencedOpportunityIds"> & { references: { id: string; title: string; status: string; score: number | null }[] })[]> {
  const allIds = [...new Set(turns.flatMap((t) => t.referencedOpportunityIds))];
  const opportunities = await getOpportunities(allIds);
  const byId = new Map(opportunities.map((o) => [o.id, o]));
  return turns.map(({ referencedOpportunityIds, ...rest }) => ({
    ...rest,
    references: referencedOpportunityIds
      .map((id) => byId.get(id))
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => ({ id: o.id, title: o.title, status: o.status, score: o.opportunityScore })),
  }));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });

  // El aislamiento entre usuarios vive en la consulta misma (WHERE
  // user_email = ...) — un sessionId ajeno simplemente no trae filas, sin
  // necesidad de un chequeo aparte acá.
  const turns = await listRecentTurns(sessionId, user.email, ARCHAT_HISTORY_LIMIT);
  const withRefs = await attachReferences(turns);

  return NextResponse.json({ turns: withRefs });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "GEMINI_API_KEY no está configurado todavía." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!sessionId || !message) {
    return NextResponse.json({ error: "Falta sessionId o message." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "El mensaje es demasiado largo (máximo 2000 caracteres)." }, { status: 400 });
  }

  const [persona, priorTurns] = await Promise.all([
    getAgentPersona(),
    listRecentTurns(sessionId, user.email, ARCHAT_HISTORY_LIMIT),
  ]);

  let result;
  try {
    result = await raceTimeout(
      chatWithAgent({
        persona,
        history: priorTurns.map((t: ArChatTurn) => ({ role: t.role, content: t.content })),
        message,
        userEmail: user.email,
        userRoles: user.roles,
      }),
      45_000
    );
  } catch (err) {
    if (err instanceof TimeoutError) {
      return NextResponse.json({ error: "El agente no respondió a tiempo — probá de nuevo en un rato." }, { status: 504 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido." }, { status: 500 });
  }

  await appendTurn(sessionId, user.email, "user", message);
  await appendTurn(sessionId, user.email, "model", result.reply, result.referencedOpportunityIds, result.groundingSnapshot);

  const [withRefs] = await attachReferences([{ referencedOpportunityIds: result.referencedOpportunityIds }]);

  return NextResponse.json({ reply: result.reply, references: withRefs.references });
}
