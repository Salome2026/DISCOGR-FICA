import { sql } from "@vercel/postgres";

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
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS booking_shows_sheet_cell_idx
        ON booking_shows (sheet_row, sheet_col) WHERE source = 'sheet'
      `;

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
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
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
    source: (r.source as string | null) ?? "manual",
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listShows(): Promise<BookingShow[]> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT * FROM booking_shows ORDER BY fecha ASC, id ASC`;
  return rows.map(rowToShow);
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

export async function deleteShow(id: string): Promise<void> {
  await ensureBookingSchema();
  await sql`DELETE FROM booking_shows WHERE id = ${id}`;
}

export type SheetShow = {
  artistName: string;
  fecha: string;
  notas: string;
  sheetRow: number;
  sheetCol: number;
};

// Mirrors the Google Sheet's cells 1:1 into booking_shows rows tagged
// source='sheet' — upserted by (sheetRow, sheetCol) since a free-text
// calendar cell has no other stable identity. Any previously-synced row
// whose cell is no longer present (cleared, or the whole sheet shrank) is
// deleted, so the sheet stays the single source of truth for its own rows.
// Manual rows (source='manual') are never touched by this function.
export async function syncSheetShows(cells: SheetShow[]): Promise<{ upserted: number; removed: number }> {
  await ensureBookingSchema();
  for (const c of cells) {
    const id = `sheet-${c.sheetRow}-${c.sheetCol}`;
    await sql`
      INSERT INTO booking_shows
        (id, artist_name, fecha, estado, notas, source, sheet_row, sheet_col, updated_at)
      VALUES
        (${id}, ${c.artistName}, ${c.fecha}::date, 'Pendiente', ${c.notas}, 'sheet', ${c.sheetRow}, ${c.sheetCol}, now())
      ON CONFLICT (sheet_row, sheet_col) WHERE source = 'sheet'
      DO UPDATE SET artist_name = EXCLUDED.artist_name, fecha = EXCLUDED.fecha, notas = EXCLUDED.notas, updated_at = now()
    `;
  }
  const keep = cells.map((c) => `sheet-${c.sheetRow}-${c.sheetCol}`);
  const { rows } = await sql`SELECT id FROM booking_shows WHERE source = 'sheet'`;
  const stale = rows.map((r) => r.id as string).filter((id) => !keep.includes(id));
  let removed = 0;
  for (const id of stale) {
    await sql`DELETE FROM booking_shows WHERE id = ${id}`;
    removed++;
  }
  return { upserted: cells.length, removed };
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
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listContacts(): Promise<BookingContact[]> {
  await ensureBookingSchema();
  const { rows } = await sql`SELECT * FROM booking_contacts ORDER BY nombre ASC`;
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
  createdBy: string;
};

export async function createContact(input: NewContact): Promise<BookingContact> {
  await ensureBookingSchema();
  const id = `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO booking_contacts
      (id, nombre, apellido, venue_nombre, telefono, whatsapp, instagram, email, observaciones, updated_by, updated_at)
    VALUES
      (${id}, ${input.nombre}, ${input.apellido}, ${input.venueNombre}, ${input.telefono}, ${input.whatsapp},
       ${input.instagram}, ${input.email}, ${input.observaciones}, ${input.createdBy}, now())
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
      updated_by = ${input.createdBy},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToContact(rows[0]) : null;
}

export async function deleteContact(id: string): Promise<void> {
  await ensureBookingSchema();
  await sql`DELETE FROM booking_contacts WHERE id = ${id}`;
}
