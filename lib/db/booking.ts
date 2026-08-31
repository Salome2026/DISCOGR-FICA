import { sql } from "@vercel/postgres";
import { recordAudit } from "./users";

// @vercel/postgres's sql`` typings only accept Primitive (no arrays), even
// though the underlying driver happily sends a JS array as a real Postgres
// array parameter (same workaround as lib/db/fonogramasSheet.ts) — this cast
// exists purely to satisfy that overly-narrow type, not to change behavior.
function arrayParam<T>(items: T[]): string | number | boolean {
  return items as unknown as string;
}

let ready: Promise<void> | null = null;

export function ensureBookingSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS booking_shows (
          id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          fecha DATE NOT NULL,
          hora TEXT,
          venue TEXT,
          ciudad TEXT,
          provincia TEXT,
          pais TEXT,
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          estado TEXT NOT NULL DEFAULT 'Pendiente',
          contacto_id TEXT,
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      // Best-effort fee extracted from the sheet cell's free text (e.g. "1.5",
      // "4,5k") — shown alongside notas, never replacing it, since the
      // extraction can't always tell a fee apart from a time or deposit.
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS valor TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS booking_shows_fecha_idx ON booking_shows (fecha)`;
      await sql`CREATE INDEX IF NOT EXISTS booking_shows_artist_idx ON booking_shows (artist_name)`;

      // Sheet-imported rows: 'source' distinguishes them from manual entries so a
      // re-sync only ever touches its own rows, never something the team typed in
      // directly. sheet_row/sheet_col are the cell's position in the grid — the
      // only stable identity a free-text calendar cell has (no id column exists
      // in the source sheet), used as the upsert/dedup key across syncs.
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`;
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS sheet_row INTEGER`;
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS sheet_col INTEGER`;
      // Which tab of the spreadsheet a sheet-sourced row came from ("agenda",
      // "hist2024", "hist2025", "hist2026") — each tab restarts its own
      // row/col numbering from scratch, so without this a cell in one tab
      // can collide with a same-numbered cell in another. Existing rows
      // default to 'agenda' (the only tab synced before this column existed),
      // which keeps their ids and uniqueness scope exactly as before.
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS sheet_tab TEXT NOT NULL DEFAULT 'agenda'`;
      await sql`DROP INDEX IF EXISTS booking_shows_sheet_cell_idx`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS booking_shows_sheet_cell_idx
        ON booking_shows (sheet_tab, sheet_row, sheet_col) WHERE source = 'sheet'
      `;
      // "Eliminar" archives instead of hard-deleting — a show/contact is a
      // historical record, not a scratch row. archived_at IS NULL is the
      // "still active" filter everywhere below.
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE booking_shows ADD COLUMN IF NOT EXISTS archived_by TEXT`;

      await sql`
        CREATE TABLE IF NOT EXISTS booking_contacts (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          apellido TEXT,
          venue_nombre TEXT,
          telefono TEXT,
          whatsapp TEXT,
          instagram TEXT,
          email TEXT,
          observaciones TEXT,
          provincia TEXT,
          pais TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`ALTER TABLE booking_contacts ADD COLUMN IF NOT EXISTS provincia TEXT`;
      await sql`ALTER TABLE booking_contacts ADD COLUMN IF NOT EXISTS pais TEXT`;
      await sql`ALTER TABLE booking_contacts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE booking_contacts ADD COLUMN IF NOT EXISTS archived_by TEXT`;
    })();
  }
  return ready;
}

export const ESTADOS_SHOW = ["Pendiente", "Confirmado", "Cerrado"] as const;

export type BookingShow = {
  id: string;
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
  estado: string;
  contactoId: string | null;
  notas: string | null;
  valor: string | null;
  source: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

// fecha comes back from @vercel/postgres as a Date object (not a string)
// until JSON-serialized by the route handler — String(dateObject).slice(0,10)
// silently produces garbage ("Thu Aug 20" instead of "2026-08-20").
function toDateKey(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToShow(r: Record<string, unknown>): BookingShow {
  return {
    id: r.id as string,
    artistName: r.artist_name as string,
    fecha: toDateKey(r.fecha),
    hora: (r.hora as string | null) ?? null,
    venue: (r.venue as string | null) ?? null,
    ciudad: (r.ciudad as string | null) ?? null,
    provincia: (r.provincia as string | null) ?? null,
    pais: (r.pais as string | null) ?? null,
    lat: (r.lat as number | null) ?? null,
    lng: (r.lng as number | null) ?? null,
    estado: r.estado as string,
    contactoId: (r.contacto_id as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    valor: (r.valor as string | null) ?? null,
    source: (r.source as string | null) ?? "manual",
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listShows(): Promise<BookingShow[]> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT * FROM booking_shows WHERE archived_at IS NULL ORDER BY fecha ASC, id ASC`;
  return rows.map(rowToShow);
}

// Many sheet-imported shows are for DJs/performers who aren't on any label
// roster and have no row in the shared `artists` table — this is how the
// artist picker (and photo lookup) find out they exist at all.
export async function listDistinctShowArtistNames(): Promise<string[]> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT DISTINCT artist_name FROM booking_shows WHERE archived_at IS NULL ORDER BY artist_name ASC`;
  return rows.map((r) => r.artist_name as string);
}

export async function getShow(id: string): Promise<BookingShow | null> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT * FROM booking_shows WHERE id = ${id}`;
  return rows[0] ? rowToShow(rows[0]) : null;
}

export type NewShow = {
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  estado: string;
  contactoId: string | null;
  notas: string | null;
  createdBy: string;
  lat?: number | null;
  lng?: number | null;
};

export async function createShow(input: NewShow): Promise<BookingShow> {
  await ensureBookingSchema();
  const id = `show-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO booking_shows
      (id, artist_name, fecha, hora, venue, ciudad, provincia, pais, lat, lng, estado, contacto_id, notas, updated_by, updated_at)
    VALUES
      (${id}, ${input.artistName}, ${input.fecha}::date, ${input.hora}, ${input.venue}, ${input.ciudad}, ${input.provincia},
       ${input.pais}, ${input.lat ?? null}, ${input.lng ?? null}, ${input.estado}, ${input.contactoId}, ${input.notas},
       ${input.createdBy}, now())
    RETURNING *
  `;
  return rowToShow(rows[0]);
}

export type UpdateShow = NewShow & { lat?: number | null; lng?: number | null };

export async function updateShow(id: string, input: UpdateShow): Promise<BookingShow | null> {
  await ensureBookingSchema();
  const current = await getShow(id);
  const lat = input.lat !== undefined ? input.lat : current?.lat ?? null;
  const lng = input.lng !== undefined ? input.lng : current?.lng ?? null;
  const { rows } = await sql`
    UPDATE booking_shows SET
      artist_name = ${input.artistName},
      fecha = ${input.fecha}::date,
      hora = ${input.hora},
      venue = ${input.venue},
      ciudad = ${input.ciudad},
      provincia = ${input.provincia},
      pais = ${input.pais},
      lat = ${lat},
      lng = ${lng},
      estado = ${input.estado},
      contacto_id = ${input.contactoId},
      notas = ${input.notas},
      updated_by = ${input.createdBy},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToShow(rows[0]) : null;
}

export async function setShowCoords(id: string, lat: number | null, lng: number | null): Promise<void> {
  await ensureBookingSchema();
  await sql`UPDATE booking_shows SET lat = ${lat}, lng = ${lng} WHERE id = ${id}`;
}

export async function deleteShow(id: string, actorEmail: string): Promise<void> {
  await ensureBookingSchema();
  await sql`UPDATE booking_shows SET archived_at = now(), archived_by = ${actorEmail} WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "show_archived", entityType: "booking_show", entityId: id });
}

export type SheetShow = {
  artistName: string;
  fecha: string;
  notas: string;
  valor: string | null;
  sheetTab: string;
  sheetRow: number;
  sheetCol: number;
};

// The "agenda" tab was the only one synced before sheetTab existed, so its
// id format stays bare (sheet-<row>-<col>) to avoid orphaning anything that
// already points at one of those ids (e.g. tourmanager_hojas.booking_show_id).
// Every other tab gets its name folded into the id, since that space is new.
function sheetShowId(c: SheetShow): string {
  return c.sheetTab === "agenda"
    ? `sheet-${c.sheetRow}-${c.sheetCol}`
    : `sheet-${c.sheetTab}-${c.sheetRow}-${c.sheetCol}`;
}

// Mirrors the Google Sheet's cells 1:1 into booking_shows rows tagged
// source='sheet' — upserted by (sheetTab, sheetRow, sheetCol) since a
// free-text calendar cell has no other stable identity. Cells from every
// synced tab are expected in one combined call, since the stale-row cleanup
// below removes any previously-synced row not present in THIS call — call it
// per-tab and every other tab's rows would look stale and get deleted.
// Manual rows (source='manual') are never touched by this function.
//
// Once the three "Hist <year>" tabs got added on top of the live agenda, a
// sync could carry ~2000 cells — one round-trip per row (the original
// version of this function) took minutes and risked the serverless
// function's own timeout, same failure mode already solved once for
// lib/db/fonogramasSheet.ts. unnest() turns the whole upsert into a single
// statement; @vercel/postgres passes a plain JS array straight through as a
// real Postgres array parameter, no manual array-literal building needed.
export async function syncSheetShows(cells: SheetShow[]): Promise<{ upserted: number; removed: number }> {
  await ensureBookingSchema();
  if (cells.length === 0) {
    const { rowCount } = await sql`DELETE FROM booking_shows WHERE source = 'sheet'`;
    return { upserted: 0, removed: rowCount ?? 0 };
  }

  const ids = cells.map(sheetShowId);
  const artistNames = cells.map((c) => c.artistName);
  const fechas = cells.map((c) => c.fecha);
  const notas = cells.map((c) => c.notas);
  const valores = cells.map((c) => c.valor);
  const sheetTabs = cells.map((c) => c.sheetTab);
  const sheetRows = cells.map((c) => c.sheetRow);
  const sheetCols = cells.map((c) => c.sheetCol);

  await sql`
    INSERT INTO booking_shows
      (id, artist_name, fecha, estado, notas, valor, source, sheet_tab, sheet_row, sheet_col, updated_at)
    SELECT id, artist_name, fecha, 'Pendiente', notas, valor, 'sheet', sheet_tab, sheet_row, sheet_col, now()
    FROM unnest(
      ${arrayParam(ids)}::text[], ${arrayParam(artistNames)}::text[], ${arrayParam(fechas)}::date[],
      ${arrayParam(notas)}::text[], ${arrayParam(valores)}::text[],
      ${arrayParam(sheetTabs)}::text[], ${arrayParam(sheetRows)}::int[], ${arrayParam(sheetCols)}::int[]
    ) AS t(id, artist_name, fecha, notas, valor, sheet_tab, sheet_row, sheet_col)
    ON CONFLICT (sheet_tab, sheet_row, sheet_col) WHERE source = 'sheet'
    DO UPDATE SET artist_name = EXCLUDED.artist_name, fecha = EXCLUDED.fecha, notas = EXCLUDED.notas, valor = EXCLUDED.valor, updated_at = now()
  `;

  const { rowCount } = await sql`
    DELETE FROM booking_shows WHERE source = 'sheet' AND NOT (id = ANY(${arrayParam(ids)}::text[]))
  `;
  return { upserted: cells.length, removed: rowCount ?? 0 };
}

export type BookingContact = {
  id: string;
  nombre: string;
  apellido: string | null;
  venueNombre: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  observaciones: string | null;
  provincia: string | null;
  pais: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToContact(r: Record<string, unknown>): BookingContact {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    apellido: (r.apellido as string | null) ?? null,
    venueNombre: (r.venue_nombre as string | null) ?? null,
    telefono: (r.telefono as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    instagram: (r.instagram as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    observaciones: (r.observaciones as string | null) ?? null,
    provincia: (r.provincia as string | null) ?? null,
    pais: (r.pais as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listContacts(): Promise<BookingContact[]> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT * FROM booking_contacts WHERE archived_at IS NULL ORDER BY nombre ASC`;
  return rows.map(rowToContact);
}

export type NewContact = {
  nombre: string;
  apellido: string | null;
  venueNombre: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  observaciones: string | null;
  provincia: string | null;
  pais: string | null;
  createdBy: string;
};

export async function createContact(input: NewContact): Promise<BookingContact> {
  await ensureBookingSchema();
  const id = `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO booking_contacts
      (id, nombre, apellido, venue_nombre, telefono, whatsapp, instagram, email, observaciones, provincia, pais, updated_by, updated_at)
    VALUES
      (${id}, ${input.nombre}, ${input.apellido}, ${input.venueNombre}, ${input.telefono}, ${input.whatsapp},
       ${input.instagram}, ${input.email}, ${input.observaciones}, ${input.provincia}, ${input.pais}, ${input.createdBy}, now())
    RETURNING *
  `;
  return rowToContact(rows[0]);
}

export async function updateContact(id: string, input: NewContact): Promise<BookingContact | null> {
  await ensureBookingSchema();
  const { rows } = await sql`
    UPDATE booking_contacts SET
      nombre = ${input.nombre},
      apellido = ${input.apellido},
      venue_nombre = ${input.venueNombre},
      telefono = ${input.telefono},
      whatsapp = ${input.whatsapp},
      instagram = ${input.instagram},
      email = ${input.email},
      observaciones = ${input.observaciones},
      provincia = ${input.provincia},
      pais = ${input.pais},
      updated_by = ${input.createdBy},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToContact(rows[0]) : null;
}

export async function deleteContact(id: string, actorEmail: string): Promise<void> {
  await ensureBookingSchema();
  await sql`UPDATE booking_contacts SET archived_at = now(), archived_by = ${actorEmail} WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "contact_archived", entityType: "booking_contact", entityId: id });
}
