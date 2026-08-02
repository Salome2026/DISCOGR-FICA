const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

function getEnv() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!token || !databaseId) {
    throw new Error(
      "Faltan NOTION_TOKEN y/o NOTION_DATABASE_ID en las variables de entorno."
    );
  }
  return { token, databaseId };
}

async function notionFetch(path: string, init?: RequestInit) {
  const { token } = getEnv();
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API error ${res.status}: ${body}`);
  }
  return res.json();
}

export type Release = {
  id: string;
  nombre: string;
  compania: string | null;
  estado: string[];
  prioridad: string | null;
  porcentaje: number | null;
};

function extractText(richText: unknown): string {
  if (!Array.isArray(richText)) return "";
  return richText.map((t) => t?.plain_text ?? "").join("");
}

export async function listReleases(): Promise<Release[]> {
  const { databaseId } = getEnv();
  const results: Release[] = [];
  let cursor: string | undefined;

  do {
    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({
        start_cursor: cursor,
        page_size: 100,
      }),
    });

    for (const page of data.results) {
      const props = page.properties;
      results.push({
        id: page.id,
        nombre: extractText(props["Nombre Acuerdo "]?.title),
        compania: props["COMPAÑIA"]?.rich_text
          ? extractText(props["COMPAÑIA"].rich_text)
          : null,
        estado: (props["ESTADO"]?.multi_select ?? []).map(
          (o: { name: string }) => o.name
        ),
        prioridad: props["Prioridad"]?.select?.name ?? null,
        porcentaje: props["%"]?.number ?? null,
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

export async function createRelease(input: {
  nombre: string;
  compania?: string;
  prioridad?: string;
  comentario?: string;
}) {
  const { databaseId } = getEnv();

  const properties: Record<string, unknown> = {
    "Nombre Acuerdo ": {
      title: [{ text: { content: input.nombre } }],
    },
  };

  if (input.compania) {
    properties["COMPAÑIA"] = {
      rich_text: [{ text: { content: input.compania } }],
    };
  }

  if (input.prioridad) {
    properties["Prioridad"] = { select: { name: input.prioridad } };
  }

  if (input.comentario) {
    properties["Comentario Estado (Negociacion - Enviado a la Firma)  )"] = {
      rich_text: [{ text: { content: input.comentario } }],
    };
  }

  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
}
