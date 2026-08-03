import { sql } from "@vercel/postgres";
import { readFileSync } from "fs";

const tracks = JSON.parse(readFileSync(new URL("../data/tracks.json", import.meta.url)));

await sql`
  CREATE TABLE IF NOT EXISTS catalog_tracks (
    id TEXT PRIMARY KEY,
    isrc TEXT,
    track TEXT NOT NULL,
    album TEXT,
    release_date TEXT,
    upc TEXT,
    company TEXT,
    artist_display TEXT NOT NULL,
    participants JSONB NOT NULL DEFAULT '[]',
    sello TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT,
    updated_at TIMESTAMPTZ
  )
`;
await sql`CREATE INDEX IF NOT EXISTS catalog_tracks_sello_idx ON catalog_tracks (sello)`;

let inserted = 0;
let skipped = 0;

for (const t of tracks) {
  const { rows } = await sql`
    INSERT INTO catalog_tracks
      (id, isrc, track, album, release_date, upc, company, artist_display, participants, sello)
    VALUES
      (${t.id}, ${t.isrc || null}, ${t.track}, ${t.album || null}, ${t.release_date || null},
       ${t.upc || null}, ${t.company || null}, ${t.artist_display},
       ${JSON.stringify(t.participants)}::jsonb, ${t.sello})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  if (rows.length > 0) inserted++;
  else skipped++;
}

console.log(`Insertados: ${inserted}, ya existían (sin tocar): ${skipped}, total planilla: ${tracks.length}`);
