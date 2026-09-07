import { sql } from "@vercel/postgres";

// Historial de conversación con el agente de A&R — módulo propio, ciclo de
// vida distinto al resto de ar_opportunities.ts (conversación interactiva,
// no un job de fondo), append-only por construcción (sin UPDATE/DELETE
// expuesto), mismo criterio que rizzvor_project_comments.
let ready: Promise<void> | null = null;

export function ensureArChatSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_chat_messages (
          id BIGSERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          referenced_opportunity_ids TEXT[] NOT NULL DEFAULT '{}',
          grounding_snapshot TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS ar_chat_messages_session_idx ON ar_chat_messages (session_id, created_at)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_chat_messages_email_idx ON ar_chat_messages (user_email, created_at DESC)`;
    })();
  }
  return ready;
}

export type ArChatTurn = {
  id: number;
  sessionId: string;
  userEmail: string;
  role: "user" | "model";
  content: string;
  referencedOpportunityIds: string[];
  createdAt: string;
};

function rowToTurn(r: Record<string, unknown>): ArChatTurn {
  return {
    id: Number(r.id),
    sessionId: r.session_id as string,
    userEmail: r.user_email as string,
    role: r.role as "user" | "model",
    content: r.content as string,
    referencedOpportunityIds: (r.referenced_opportunity_ids as string[]) ?? [],
    createdAt: r.created_at as string,
  };
}

function pgArrayLiteral(items: string[]): string {
  // El orden importa: escapar la barra invertida ANTES que la comilla, o un
  // elemento que termine en "\" deja un `\"` colgante que Postgres lee como
  // una comilla escapada en vez del cierre del elemento.
  return `{${items.map((i) => `"${i.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

// Un solo límite para el historial visible del panel y para el contexto que
// recibe Gemini — que el modelo "olvide" algo que el usuario todavía ve en
// pantalla es peor que un historial más corto, así que ambos usan el mismo
// número en vez de dos ventanas distintas.
export const ARCHAT_HISTORY_LIMIT = 20;

// Últimos N turnos de ESTE usuario en esta sesión, en orden cronológico (el
// sub-select ordena descendente para tomar "los más recientes", el ORDER BY
// externo los deja en orden de lectura). El filtro por user_email vive acá,
// no en el código que llama — así ningún caller nuevo puede olvidarse del
// aislamiento entre usuarios: un sessionId ajeno simplemente no devuelve
// filas, en vez de depender de que cada ruta repita el chequeo a mano.
export async function listRecentTurns(sessionId: string, userEmail: string, limit: number): Promise<ArChatTurn[]> {
  await ensureArChatSchema();
  const { rows } = await sql`
    SELECT * FROM (
      SELECT * FROM ar_chat_messages WHERE session_id = ${sessionId} AND user_email = ${userEmail}
      ORDER BY created_at DESC, id DESC LIMIT ${limit}
    ) sub ORDER BY created_at ASC, id ASC
  `;
  return rows.map(rowToTurn);
}

export async function appendTurn(
  sessionId: string,
  userEmail: string,
  role: "user" | "model",
  content: string,
  referencedOpportunityIds: string[] = [],
  groundingSnapshot: string | null = null
): Promise<ArChatTurn> {
  await ensureArChatSchema();
  const refLit = pgArrayLiteral(referencedOpportunityIds);
  const { rows } = await sql`
    INSERT INTO ar_chat_messages (session_id, user_email, role, content, referenced_opportunity_ids, grounding_snapshot)
    VALUES (${sessionId}, ${userEmail}, ${role}, ${content}, ${refLit}::text[], ${groundingSnapshot})
    RETURNING *
  `;
  return rowToTurn(rows[0]);
}
