import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog, type AuditEntry } from "@/lib/db/users";

let ready: Promise<void> | null = null;

export function ensurePmStudioBookingsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS pm_studio_bookings (
          id TEXT PRIMARY KEY,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          studio TEXT NOT NULL,
          booking_date DATE NOT NULL,
          shift TEXT NOT NULL,
          comment TEXT,
          booked_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ,
          cancelled_at TIMESTAMPTZ,
          cancelled_by TEXT,
          cancel_reason TEXT
        )
      `;
      // At most one active booking per (studio, date, shift) — this is the
      // actual double-booking guard, not application code. Same idiom as
      // spotify_playlist_tracks_active_idx (lib/db/spotifyPlaylistTracks.ts).
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS pm_studio_bookings_active_idx
        ON pm_studio_bookings (studio, booking_date, shift) WHERE cancelled_at IS NULL
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_studio_bookings_date_idx ON pm_studio_bookings (booking_date)`;
    })();
  }
  return ready;
}

export const STUDIOS = ["Estudio A", "Estudio B"] as const;
export type Studio = (typeof STUDIOS)[number];
export const SHIFTS = ["12:00-15:00", "16:00-19:00"] as const;
export type Shift = (typeof SHIFTS)[number];

export type StudioBooking = {
  id: string;
  artistId: string;
  artistName: string;
  artistPhotoUrl: string | null;
  studio: string;
  bookingDate: string;
  shift: string;
  comment: string | null;
  bookedBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function newId(): string {
  return `stb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToBooking(r: Record<string, unknown>): StudioBooking {
  return {
    id: r.id as string,
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    artistPhotoUrl: (r.photo_url as string | null) ?? null,
    studio: r.studio as string,
    bookingDate: r.booking_date as string,
    shift: r.shift as string,
    comment: (r.comment as string | null) ?? null,
    bookedBy: r.booked_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function listBookingsForRange(start: string, end: string): Promise<StudioBooking[]> {
  await ensurePmStudioBookingsSchema();
  const { rows } = await sql`
    SELECT b.*, a.photo_url
    FROM pm_studio_bookings b
    LEFT JOIN artists a ON a.id = b.artist_id
    WHERE b.cancelled_at IS NULL AND b.booking_date >= ${start} AND b.booking_date <= ${end}
    ORDER BY b.booking_date ASC
  `;
  return rows.map(rowToBooking);
}

export async function getBooking(id: string): Promise<StudioBooking | null> {
  await ensurePmStudioBookingsSchema();
  const { rows } = await sql`
    SELECT b.*, a.photo_url
    FROM pm_studio_bookings b
    LEFT JOIN artists a ON a.id = b.artist_id
    WHERE b.id = ${id}
  `;
  return rows[0] ? rowToBooking(rows[0]) : null;
}

// Returns null when the slot was already taken (ON CONFLICT DO NOTHING
// yields zero rows) — the caller translates that into a 409, never a thrown
// error, since a collision here is an expected outcome, not a bug.
export async function createBooking(
  input: { artistId: string; artistName: string; studio: string; bookingDate: string; shift: string; comment: string | null },
  actorEmail: string
): Promise<StudioBooking | null> {
  await ensurePmStudioBookingsSchema();
  const id = newId();
  const { rows } = await sql`
    INSERT INTO pm_studio_bookings (id, artist_id, artist_name, studio, booking_date, shift, comment, booked_by)
    VALUES (${id}, ${input.artistId}, ${input.artistName}, ${input.studio}, ${input.bookingDate}, ${input.shift}, ${input.comment}, ${actorEmail})
    ON CONFLICT (studio, booking_date, shift) WHERE cancelled_at IS NULL DO NOTHING
    RETURNING *
  `;
  if (!rows[0]) return null;
  await recordAudit({
    actorEmail,
    action: "pm_studio_booking_created",
    entityType: "pm_studio_booking",
    entityId: id,
    after: { artistName: input.artistName, studio: input.studio, bookingDate: input.bookingDate, shift: input.shift },
  });
  return getBooking(id);
}

// Reassignment (studio/date/shift/artist) is an UPDATE of the same row, not
// cancel+recreate — preserves the booking's own id/history. Guarded by the
// same partial unique index; a collision throws 23505, caught here and
// surfaced as null (same "conflict = null, not an exception" convention as
// createBooking) so both API routes handle it identically.
export async function updateBooking(
  id: string,
  patch: { artistId?: string; artistName?: string; studio?: string; bookingDate?: string; shift?: string; comment?: string | null },
  actorEmail: string
): Promise<StudioBooking | null> {
  await ensurePmStudioBookingsSchema();
  const current = await getBooking(id);
  if (!current) return null;

  const artistId = patch.artistId ?? current.artistId;
  const artistName = patch.artistName ?? current.artistName;
  const studio = patch.studio ?? current.studio;
  const bookingDate = patch.bookingDate ?? current.bookingDate;
  const shift = patch.shift ?? current.shift;
  const comment = patch.comment !== undefined ? patch.comment : current.comment;

  try {
    const { rows } = await sql`
      UPDATE pm_studio_bookings SET
        artist_id = ${artistId}, artist_name = ${artistName}, studio = ${studio},
        booking_date = ${bookingDate}, shift = ${shift}, comment = ${comment},
        updated_by = ${actorEmail}, updated_at = now()
      WHERE id = ${id} AND cancelled_at IS NULL
      RETURNING *
    `;
    if (!rows[0]) return null;
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }

  await recordAudit({
    actorEmail,
    action: "pm_studio_booking_updated",
    entityType: "pm_studio_booking",
    entityId: id,
    before: { artistName: current.artistName, studio: current.studio, bookingDate: current.bookingDate, shift: current.shift },
    after: { artistName, studio, bookingDate, shift },
  });
  return getBooking(id);
}

export async function cancelBooking(id: string, reason: string, actorEmail: string): Promise<StudioBooking | null> {
  await ensurePmStudioBookingsSchema();
  const current = await getBooking(id);
  if (!current) return null;

  const { rows } = await sql`
    UPDATE pm_studio_bookings SET cancelled_at = now(), cancelled_by = ${actorEmail}, cancel_reason = ${reason}
    WHERE id = ${id} AND cancelled_at IS NULL
    RETURNING *
  `;
  if (!rows[0]) return null;

  await recordAudit({
    actorEmail,
    action: "pm_studio_booking_cancelled",
    entityType: "pm_studio_booking",
    entityId: id,
    before: { artistName: current.artistName, studio: current.studio, bookingDate: current.bookingDate, shift: current.shift },
    detail: reason,
  });
  return current;
}

export async function getBookingHistory(id: string): Promise<AuditEntry[]> {
  return getAuditLog({ entityType: "pm_studio_booking", entityId: id });
}
