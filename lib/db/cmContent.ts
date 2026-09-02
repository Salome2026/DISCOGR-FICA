import { sql } from "@vercel/postgres";
import { recordAudit } from "@/lib/db/users";
import { ensureCmAccountsSchema } from "@/lib/db/cmAccounts";

// @vercel/postgres's sql`` typings only accept Primitive (no arrays), even
// though the underlying driver happily sends a JS array as a real Postgres
// array parameter (same workaround as lib/db/listeners.ts) — this cast
// exists purely to satisfy that overly-narrow type, not to change behavior.
function arrayParam<T>(items: T[]): string | number | boolean {
  return items as unknown as string;
}

export const CM_TIPOS_CONTENIDO = ["reel", "historia", "tiktok", "short", "post", "anuncio", "recordatorio"] as const;
export type CmTipoContenido = (typeof CM_TIPOS_CONTENIDO)[number];

export const CM_ESTADOS = ["idea", "pendiente_material", "en_produccion", "listo", "programado", "publicado", "cancelado"] as const;
export type CmEstado = (typeof CM_ESTADOS)[number];

export const CM_PLATAFORMAS = ["Instagram", "TikTok", "YouTube Shorts", "Otra"] as const;
export type CmPlataforma = (typeof CM_PLATAFORMAS)[number];

let ready: Promise<void> | null = null;

export function ensureCmContentSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureCmAccountsSchema();
      await sql`
        CREATE TABLE IF NOT EXISTS cm_content_items (
          id BIGSERIAL PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES cm_accounts(id) ON DELETE CASCADE,
          artist_name TEXT,
          linked_artist_id TEXT,
          tipo_contenido TEXT NOT NULL,
          fecha DATE NOT NULL,
          hora TEXT,
          copy_text TEXT,
          hashtags TEXT,
          assets_url TEXT,
          audio_url TEXT,
          responsable_email TEXT,
          estado TEXT NOT NULL DEFAULT 'idea',
          published_url TEXT,
          bloqueado_motivo TEXT,
          linked_launch_id TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS cm_content_items_account_idx ON cm_content_items (account_id)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_content_items_fecha_idx ON cm_content_items (fecha)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_content_items_launch_idx ON cm_content_items (linked_launch_id)`;
      await sql`ALTER TABLE cm_content_items ADD COLUMN IF NOT EXISTS titulo TEXT`;
      await sql`ALTER TABLE cm_content_items ADD COLUMN IF NOT EXISTS plataforma TEXT`;
    })();
  }
  return ready;
}

export type CmContentItem = {
  id: number;
  accountId: string;
  artistName: string | null;
  linkedArtistId: string | null;
  tipoContenido: string;
  titulo: string | null;
  plataforma: string | null;
  fecha: string;
  hora: string | null;
  copyText: string | null;
  hashtags: string | null;
  assetsUrl: string | null;
  audioUrl: string | null;
  responsableEmail: string | null;
  estado: string;
  publishedUrl: string | null;
  bloqueadoMotivo: string | null;
  linkedLaunchId: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToItem(r: Record<string, unknown>): CmContentItem {
  return {
    id: Number(r.id),
    accountId: r.account_id as string,
    artistName: (r.artist_name as string) ?? null,
    linkedArtistId: (r.linked_artist_id as string) ?? null,
    tipoContenido: r.tipo_contenido as string,
    titulo: (r.titulo as string) ?? null,
    plataforma: (r.plataforma as string) ?? null,
    fecha: r.fecha as string,
    hora: (r.hora as string) ?? null,
    copyText: (r.copy_text as string) ?? null,
    hashtags: (r.hashtags as string) ?? null,
    assetsUrl: (r.assets_url as string) ?? null,
    audioUrl: (r.audio_url as string) ?? null,
    responsableEmail: (r.responsable_email as string) ?? null,
    estado: r.estado as string,
    publishedUrl: (r.published_url as string) ?? null,
    bloqueadoMotivo: (r.bloqueado_motivo as string) ?? null,
    linkedLaunchId: (r.linked_launch_id as string) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  };
}

export async function createContentItem(input: {
  accountId: string;
  artistName: string | null;
  linkedArtistId: string | null;
  tipoContenido: string;
  titulo: string | null;
  plataforma: string | null;
  fecha: string;
  hora: string | null;
  copyText: string | null;
  hashtags: string | null;
  assetsUrl: string | null;
  audioUrl: string | null;
  responsableEmail: string | null;
  estado: string;
  linkedLaunchId: string | null;
  createdBy: string;
}): Promise<CmContentItem> {
  await ensureCmContentSchema();
  const { rows } = await sql`
    INSERT INTO cm_content_items
      (account_id, artist_name, linked_artist_id, tipo_contenido, titulo, plataforma, fecha, hora, copy_text, hashtags, assets_url, audio_url, responsable_email, estado, linked_launch_id, created_by)
    VALUES
      (${input.accountId}, ${input.artistName}, ${input.linkedArtistId}, ${input.tipoContenido}, ${input.titulo}, ${input.plataforma}, ${input.fecha}, ${input.hora},
       ${input.copyText}, ${input.hashtags}, ${input.assetsUrl}, ${input.audioUrl}, ${input.responsableEmail}, ${input.estado}, ${input.linkedLaunchId}, ${input.createdBy})
    RETURNING *
  `;
  return rowToItem(rows[0]);
}

export async function updateContentItem(
  id: number,
  patch: Partial<{
    tipoContenido: string; titulo: string | null; plataforma: string | null; fecha: string; hora: string | null; copyText: string | null; hashtags: string | null;
    assetsUrl: string | null; audioUrl: string | null; responsableEmail: string | null; estado: string;
    publishedUrl: string | null; bloqueadoMotivo: string | null;
  }>,
  actorEmail: string
): Promise<void> {
  await ensureCmContentSchema();
  const current = await getContentItem(id);
  if (!current) return;
  await sql`
    UPDATE cm_content_items SET
      tipo_contenido = ${patch.tipoContenido ?? current.tipoContenido},
      titulo = ${patch.titulo !== undefined ? patch.titulo : current.titulo},
      plataforma = ${patch.plataforma !== undefined ? patch.plataforma : current.plataforma},
      fecha = ${patch.fecha ?? current.fecha},
      hora = ${patch.hora !== undefined ? patch.hora : current.hora},
      copy_text = ${patch.copyText !== undefined ? patch.copyText : current.copyText},
      hashtags = ${patch.hashtags !== undefined ? patch.hashtags : current.hashtags},
      assets_url = ${patch.assetsUrl !== undefined ? patch.assetsUrl : current.assetsUrl},
      audio_url = ${patch.audioUrl !== undefined ? patch.audioUrl : current.audioUrl},
      responsable_email = ${patch.responsableEmail !== undefined ? patch.responsableEmail : current.responsableEmail},
      estado = ${patch.estado ?? current.estado},
      published_url = ${patch.publishedUrl !== undefined ? patch.publishedUrl : current.publishedUrl},
      bloqueado_motivo = ${patch.bloqueadoMotivo !== undefined ? patch.bloqueadoMotivo : current.bloqueadoMotivo},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
  `;
  if (patch.estado && patch.estado !== current.estado) {
    await recordAudit({ actorEmail, action: "cm_content_estado_changed", entityType: "cm_content_item", entityId: String(id), before: { estado: current.estado }, after: { estado: patch.estado } });
  }
}

export async function getContentItem(id: number): Promise<CmContentItem | null> {
  await ensureCmContentSchema();
  const { rows } = await sql`SELECT * FROM cm_content_items WHERE id = ${id}`;
  return rows[0] ? rowToItem(rows[0]) : null;
}

export async function listContentForAccount(accountId: string): Promise<CmContentItem[]> {
  await ensureCmContentSchema();
  const { rows } = await sql`SELECT * FROM cm_content_items WHERE account_id = ${accountId} ORDER BY fecha DESC, id DESC`;
  return rows.map(rowToItem);
}

export async function listContentForAccounts(accountIds: string[], startDate: string, endDate: string): Promise<CmContentItem[]> {
  await ensureCmContentSchema();
  if (accountIds.length === 0) return [];
  const { rows } = await sql`
    SELECT * FROM cm_content_items
    WHERE account_id = ANY(${arrayParam(accountIds)}::text[]) AND fecha BETWEEN ${startDate} AND ${endDate}
    ORDER BY fecha ASC, hora ASC NULLS LAST
  `;
  return rows.map(rowToItem);
}

export async function deleteContentItem(id: number): Promise<void> {
  await ensureCmContentSchema();
  await sql`DELETE FROM cm_content_items WHERE id = ${id}`;
}
