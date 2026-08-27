import { sql } from "@vercel/postgres";
import { ensurePublishingArtistsSchema } from "./publishingArtists";
import { recordAudit } from "./users";
import type { EditorialSplit, SplitPerson, SplitPersonInput, SplitCard } from "@discografica/shared/types/editorialSplits";

export type { EditorialSplit, SplitPerson, SplitPersonInput, SplitCard };

let ready: Promise<void> | null = null;

export function ensureEditorialSplitsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS editorial_splits (
          id TEXT PRIMARY KEY,
          catalog_track_id TEXT,
          track_name TEXT NOT NULL,
          artist_display TEXT NOT NULL,
          sello TEXT,
          letra JSONB NOT NULL DEFAULT '[]',
          musica JSONB NOT NULL DEFAULT '[]',
          estado TEXT NOT NULL DEFAULT 'Pendiente',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          sent_by TEXT,
          sent_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS editorial_splits_estado_idx ON editorial_splits (estado)`;
    })();
  }
  return ready;
}

function rowToSplit(r: Record<string, unknown>): EditorialSplit {
  return {
    id: r.id as string,
    catalogTrackId: (r.catalog_track_id as string | null) ?? null,
    trackName: r.track_name as string,
    artistDisplay: r.artist_display as string,
    sello: (r.sello as string | null) ?? null,
    letra: (r.letra as SplitPerson[]) ?? [],
    musica: (r.musica as SplitPerson[]) ?? [],
    estado: r.estado as "Pendiente" | "Enviado",
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    sentBy: (r.sent_by as string | null) ?? null,
    sentAt: (r.sent_at as string | null) ?? null,
  };
}

export async function listSplits(opts: { estado: "Pendiente" | "Enviado"; q?: string }): Promise<SplitCard[]> {
  await ensureEditorialSplitsSchema();
  const q = opts.q?.trim();
  const { rows } = q
    ? await sql`
        SELECT id, track_name, artist_display, estado, created_by, created_at, sent_at
        FROM editorial_splits
        WHERE estado = ${opts.estado} AND (track_name ILIKE ${"%" + q + "%"} OR artist_display ILIKE ${"%" + q + "%"})
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, track_name, artist_display, estado, created_by, created_at, sent_at
        FROM editorial_splits
        WHERE estado = ${opts.estado}
        ORDER BY created_at DESC
      `;
  return rows.map((r) => ({
    id: r.id as string,
    trackName: r.track_name as string,
    artistDisplay: r.artist_display as string,
    estado: r.estado as "Pendiente" | "Enviado",
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    sentAt: (r.sent_at as string | null) ?? null,
  }));
}

export async function getSplit(id: string): Promise<EditorialSplit | null> {
  await ensureEditorialSplitsSchema();
  const { rows } = await sql`SELECT * FROM editorial_splits WHERE id = ${id}`;
  return rows[0] ? rowToSplit(rows[0]) : null;
}

// Sent splits have no PATCH/edit route at all — "locked after Enviado" is
// enforced by that omission, not by a flag an editor could bypass. If a
// correction is ever needed later, it should go through a dedicated
// "amend" action that itself writes an audit_log entry with before/after,
// never a silent update of letra/musica in place.
export async function markSplitSent(id: string, actorEmail: string): Promise<EditorialSplit | null> {
  await ensureEditorialSplitsSchema();
  const { rows } = await sql`
    UPDATE editorial_splits SET estado = 'Enviado', sent_by = ${actorEmail}, sent_at = now()
    WHERE id = ${id} AND estado = 'Pendiente'
    RETURNING *
  `;
  const split = rows[0] ? rowToSplit(rows[0]) : null;
  if (split) {
    await recordAudit({
      actorEmail,
      action: "split_sent",
      entityType: "editorial_split",
      entityId: split.id,
      before: { estado: "Pendiente" },
      after: { estado: "Enviado", sentBy: split.sentBy, sentAt: split.sentAt },
    });
  }
  return split;
}

// "Una persona = una ficha": before inserting a brand-new publishing_artists
// row, check for an existing one with the same name (case/space-insensitive)
// and reuse it instead of creating a duplicate — the search-as-you-type
// picker is the primary way this is avoided, this is the server-side safety
// net for the rare race (two PMs typing the same new name at once) or a
// near-exact name the picker's fuzzy match missed.
async function resolvePerson(input: SplitPersonInput, actorEmail: string): Promise<SplitPerson> {
  if ("personId" in input) {
    const { rows } = await sql`SELECT id, nombre_artistico FROM publishing_artists WHERE id = ${input.personId}`;
    if (!rows[0]) throw new Error("Una de las personas seleccionadas ya no existe.");
    return { personId: rows[0].id as string, personName: rows[0].nombre_artistico as string, percentX100: input.percentX100 };
  }

  const name = input.newPerson.nombreArtistico.trim();
  const { rows: existing } = await sql`
    SELECT id, nombre_artistico FROM publishing_artists WHERE lower(trim(nombre_artistico)) = lower(${name}) LIMIT 1
  `;
  if (existing[0]) {
    return { personId: existing[0].id as string, personName: existing[0].nombre_artistico as string, percentX100: input.percentX100 };
  }

  const id = `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO publishing_artists
      (id, nombre_artistico, email, apellido, dni, direccion, fecha_nacimiento, sadaic, tipo, updated_by, updated_at)
    VALUES
      (${id}, ${name}, ${input.newPerson.email ?? null}, ${input.newPerson.apellido ?? null}, ${input.newPerson.dni ?? null},
       ${input.newPerson.direccion ?? null}, ${input.newPerson.fechaNacimiento ?? null}, ${input.newPerson.sadaic ?? null},
       'Externo', ${actorEmail}, now())
    RETURNING id, nombre_artistico
  `;
  return { personId: rows[0].id as string, personName: rows[0].nombre_artistico as string, percentX100: input.percentX100 };
}

export async function createSplit(input: {
  catalogTrackId: string;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  letra: SplitPersonInput[];
  musica: SplitPersonInput[];
  actorEmail: string;
}): Promise<EditorialSplit> {
  await ensureEditorialSplitsSchema();
  await ensurePublishingArtistsSchema();

  const letraSum = input.letra.reduce((s, p) => s + p.percentX100, 0);
  const musicaSum = input.musica.reduce((s, p) => s + p.percentX100, 0);
  if (letraSum !== 5000 || musicaSum !== 5000) {
    throw new Error("Letra y música tienen que sumar 50% cada una antes de enviar.");
  }

  // Sequential, not Promise.all — two rows in the same request can name the
  // same brand-new person (e.g. Letra and Música both listing "Anellei" for
  // the first time), and resolvePerson's dedupe check only sees committed
  // rows, so a parallel pair of inserts would race past it and create two.
  const letra: SplitPerson[] = [];
  for (const p of input.letra) letra.push(await resolvePerson(p, input.actorEmail));
  const musica: SplitPerson[] = [];
  for (const p of input.musica) musica.push(await resolvePerson(p, input.actorEmail));

  const id = `spl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO editorial_splits (id, catalog_track_id, track_name, artist_display, sello, letra, musica, estado, created_by)
    VALUES (${id}, ${input.catalogTrackId}, ${input.trackName}, ${input.artistDisplay}, ${input.sello},
            ${JSON.stringify(letra)}::jsonb, ${JSON.stringify(musica)}::jsonb, 'Pendiente', ${input.actorEmail})
    RETURNING *
  `;
  const split = rowToSplit(rows[0]);
  await recordAudit({
    actorEmail: input.actorEmail,
    action: "split_created",
    entityType: "editorial_split",
    entityId: split.id,
    after: { trackName: split.trackName, artistDisplay: split.artistDisplay, letra: split.letra, musica: split.musica },
  });
  return split;
}
