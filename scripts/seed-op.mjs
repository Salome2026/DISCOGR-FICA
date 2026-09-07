// Uso: node scripts/seed-op.mjs
//
// Importación real, de una sola vez, de la planilla "Fonogramas MAWZ &
// INDYANA" (Google Sheets) al módulo OP. Los CSV reales están commiteados
// en data/op/*.csv (extraídos y verificados fila por fila contra la
// planilla real antes de escribir este script — ver el plan del módulo
// OP). Idempotente: INSERT ... ON CONFLICT (id) DO NOTHING, se puede
// correr de nuevo sin duplicar. La fuente de verdad del esquema es cada
// lib/db/op*.ts — si esas tablas cambian, este script hay que
// actualizarlo en paralelo.
import { sql } from "@vercel/postgres";
import { readFileSync } from "fs";

if (!process.env.POSTGRES_URL) {
  try {
    process.loadEnvFile(new URL("../.env.local", import.meta.url));
  } catch {}
}
if (!process.env.POSTGRES_URL) {
  console.error("Falta POSTGRES_URL — corré esto con .env.local presente.");
  process.exit(1);
}

const DATA_DIR = new URL("../data/op/", import.meta.url);

// Parser CSV mínimo pero correcto (RFC4180: campos entre comillas dobles,
// comillas dobles escapadas como "", comas y saltos de línea dentro de
// comillas) — los CSV de origen usan exactamente ese formato (los generó
// el módulo csv de Python), y no hay ninguna librería de CSV instalada en
// el proyecto todavía.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = ""; rows.push(row); row = [];
    } else if (c === "\r") {
      // ignore, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

function readRows(filename) {
  const text = readFileSync(new URL(filename, DATA_DIR), "utf-8");
  return parseCsv(text);
}

function orNull(v) {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

// ISRC normalizado a mayúsculas al importar: la planilla real tiene el mismo
// ISRC cargado con distinta capitalización entre hojas (ej. "ARDL12300034"
// en ogs vs "ARdl12300034" en repertorio capif) — sin esto, el cruce CAPIF
// y la detección de duplicados fallarían por una simple diferencia de caja.
function orNullIsrc(v) {
  const s = orNull(v);
  return s === null ? null : s.toUpperCase();
}

// UPC/porcentaje/año a veces llegan como float de Excel ("8429006413713.0")
// — se limpia el ".0" final sin tocar decimales reales.
function cleanNumericString(v) {
  const s = orNull(v);
  if (s === null) return null;
  return /^\d+\.0$/.test(s) ? s.slice(0, -2) : s;
}

function parseIntOrNull(v) {
  const s = cleanNumericString(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(v) {
  const s = orNull(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Tres formatos reales de fecha conviven en la planilla: "YYYY-MM-DD
// HH:MM:SS" (ogs/remix), "YYYYMMDD.0" o "YYYYMMDD" (duplicados/temp), y
// vacío. Nunca DD/MM/YYYY en estas columnas de fecha real (ese formato
// solo aparece en el "PERÍODO" de repertorio capif, que es texto libre,
// no se parsea como fecha).
function parseDateFlexible(v) {
  const s = cleanNumericString(v);
  if (s === null) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

let inserted = 0;
let skipped = 0;

async function insertRow(table, columns, values, id) {
  const cols = ["id", ...columns, "created_by"].join(", ");
  const placeholders = values.map((_, i) => `$${i + 2}`).join(", ");
  const query = `INSERT INTO ${table} (${cols}) VALUES ($1, ${placeholders}, 'seed-op-script') ON CONFLICT (id) DO NOTHING RETURNING id`;
  const { rows } = await sql.query(query, [id, ...values]);
  if (rows.length > 0) inserted++; else skipped++;
}

function newId(prefix, n) {
  return `${prefix}-seed-${n}`;
}

// --- op_ogs ---
await sql`
  CREATE TABLE IF NOT EXISTS op_ogs (
    id TEXT PRIMARY KEY, album_artist TEXT, album TEXT, track_artist TEXT NOT NULL, track TEXT NOT NULL,
    isrc TEXT, upc TEXT, release_date DATE, year INTEGER, provider TEXT, sello TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("ogs.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [albumArtist, album, trackArtist, track, isrc, upc, releaseDate, year, provider, , sello] = r;
    if (!orNull(trackArtist) || !orNull(track)) continue;
    await insertRow(
      "op_ogs",
      ["album_artist", "album", "track_artist", "track", "isrc", "upc", "release_date", "year", "provider", "sello"],
      [orNull(albumArtist), orNull(album), trackArtist.trim(), track.trim(), orNullIsrc(isrc), cleanNumericString(upc), parseDateFlexible(releaseDate), parseIntOrNull(year), orNull(provider), orNull(sello)],
      newId("opo", n)
    );
  }
  console.log(`op_ogs: ${n} filas de origen procesadas`);
}

// --- op_remix ---
await sql`
  CREATE TABLE IF NOT EXISTS op_remix (
    id TEXT PRIMARY KEY, album_artist TEXT, album TEXT, track_artist TEXT NOT NULL, track TEXT NOT NULL,
    isrc TEXT, upc TEXT, release_date DATE, provider TEXT, sello TEXT, extra JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("remix.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [albumArtist, album, trackArtist, track, isrc, upc, releaseDate, provider, sello] = r;
    if (!orNull(trackArtist) || !orNull(track)) continue;
    await insertRow(
      "op_remix",
      ["album_artist", "album", "track_artist", "track", "isrc", "upc", "release_date", "provider", "sello"],
      [orNull(albumArtist), orNull(album), trackArtist.trim(), track.trim(), orNullIsrc(isrc), cleanNumericString(upc), parseDateFlexible(releaseDate), orNull(provider), orNull(sello)],
      newId("opr", n)
    );
  }
  console.log(`op_remix: ${n} filas de origen procesadas`);
}

// --- op_isrc_audio / op_isrc_video (unifica 2024/2025/2026) ---
await sql`
  CREATE TABLE IF NOT EXISTS op_isrc_audio (
    id TEXT PRIMARY KEY, year INTEGER NOT NULL, isrc TEXT, artista TEXT, track TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS op_isrc_video (
    id TEXT PRIMARY KEY, year INTEGER NOT NULL, isrc TEXT, artista TEXT, video TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
for (const year of [2024, 2025, 2026]) {
  const rows = readRows(`isrc_${year}_audio.csv`).slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [isrc, artista, track] = r;
    if (!orNull(isrc) && !orNull(artista) && !orNull(track)) continue;
    await insertRow("op_isrc_audio", ["year", "isrc", "artista", "track"], [year, orNullIsrc(isrc), orNull(artista), orNull(track)], newId(`opia${year}`, n));
  }
  console.log(`op_isrc_audio ${year}: ${n} filas de origen procesadas`);
}
for (const year of [2024, 2025, 2026]) {
  const rows = readRows(`isrc_${year}_vid.csv`).slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [isrc, artista, video] = r;
    if (!orNull(isrc) && !orNull(artista) && !orNull(video)) continue;
    await insertRow("op_isrc_video", ["year", "isrc", "artista", "video"], [year, orNullIsrc(isrc), orNull(artista), orNull(video)], newId(`opiv${year}`, n));
  }
  console.log(`op_isrc_video ${year}: ${n} filas de origen procesadas`);
}

// --- op_participaciones ---
await sql`
  CREATE TABLE IF NOT EXISTS op_participaciones (
    id TEXT PRIMARY KEY, label TEXT, artists TEXT, track TEXT, isrc TEXT, participante TEXT, porcentaje NUMERIC, notas TEXT,
    extra JSONB NOT NULL DEFAULT '{}', created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("Participaciones.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [label, artists, track, isrc, participante, porcentaje, notas] = r;
    await insertRow(
      "op_participaciones",
      ["label", "artists", "track", "isrc", "participante", "porcentaje", "notas"],
      [orNull(label), orNull(artists), orNull(track), orNullIsrc(isrc), orNull(participante), parseFloatOrNull(porcentaje), orNull(notas)],
      newId("opp", n)
    );
  }
  console.log(`op_participaciones: ${n} filas de origen procesadas`);
}

// --- op_repertorio_capif ---
await sql`
  CREATE TABLE IF NOT EXISTS op_repertorio_capif (
    id TEXT PRIMARY KEY, titulo TEXT, album TEXT, artista TEXT, isrc TEXT NOT NULL, sello TEXT,
    titular_derecho TEXT, periodo TEXT, anio_publicacion INTEGER, envio_monitoreo TEXT, capif TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("repertorio_capif_22012026.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [titulo, album, artista, isrc, sello, titular, periodo, anio, envio, capif] = r;
    if (!orNull(isrc)) continue;
    await insertRow(
      "op_repertorio_capif",
      ["titulo", "album", "artista", "isrc", "sello", "titular_derecho", "periodo", "anio_publicacion", "envio_monitoreo", "capif"],
      [orNull(titulo), orNull(album), orNull(artista), isrc.trim().toUpperCase(), orNull(sello), orNull(titular), orNull(periodo), parseIntOrNull(anio), orNull(envio), orNull(capif)],
      newId("opc", n)
    );
  }
  console.log(`op_repertorio_capif: ${n} filas de origen procesadas`);
}

// --- op_duplicados ---
await sql`
  CREATE TABLE IF NOT EXISTS op_duplicados (
    id TEXT PRIMARY KEY, album_artist TEXT, album TEXT, track_artist TEXT, track TEXT,
    isrc TEXT, upc TEXT, release_date DATE, provider TEXT, baja TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("duplicados.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [albumArtist, album, trackArtist, track, isrc, upc, releaseDate, provider, baja] = r;
    await insertRow(
      "op_duplicados",
      ["album_artist", "album", "track_artist", "track", "isrc", "upc", "release_date", "provider", "baja"],
      [orNull(albumArtist), orNull(album), orNull(trackArtist), orNull(track), orNullIsrc(isrc), cleanNumericString(upc), parseDateFlexible(releaseDate), orNull(provider), orNull(baja)],
      newId("opd", n)
    );
  }
  console.log(`op_duplicados: ${n} filas de origen procesadas`);
}

// --- op_indyana_old (fila 1 real del CSV es el título fusionado "FONOGRAMAS", se saltea) ---
await sql`
  CREATE TABLE IF NOT EXISTS op_indyana_old (
    id TEXT PRIMARY KEY, titulo TEXT, release_date DATE, isrc TEXT, isrc_video TEXT,
    nombre_ep_lp TEXT, upc TEXT, main_artists TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("INDYANA_old.csv").slice(2);
  let n = 0;
  for (const r of rows) {
    n++;
    const [, titulo, releaseDate, isrc, isrcVideo, nombreEpLp, upc, mainArtists] = r;
    await insertRow(
      "op_indyana_old",
      ["titulo", "release_date", "isrc", "isrc_video", "nombre_ep_lp", "upc", "main_artists"],
      [orNull(titulo), parseDateFlexible(releaseDate), orNullIsrc(isrc), orNullIsrc(isrcVideo), orNull(nombreEpLp), cleanNumericString(upc), orNull(mainArtists)],
      newId("opi", n)
    );
  }
  console.log(`op_indyana_old: ${n} filas de origen procesadas`);
}

// --- op_temp ---
await sql`
  CREATE TABLE IF NOT EXISTS op_temp (
    id TEXT PRIMARY KEY, album_artist TEXT, album TEXT, track_artist TEXT, track TEXT,
    isrc TEXT, upc TEXT, release_date DATE, provider_otw TEXT, notas TEXT,
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT, updated_at TIMESTAMPTZ
  )`;
{
  const rows = readRows("temp.csv").slice(1);
  let n = 0;
  for (const r of rows) {
    n++;
    const [albumArtist, album, trackArtist, track, isrc, upc, releaseDate, providerOtw, notas] = r;
    await insertRow(
      "op_temp",
      ["album_artist", "album", "track_artist", "track", "isrc", "upc", "release_date", "provider_otw", "notas"],
      [orNull(albumArtist), orNull(album), orNull(trackArtist), orNull(track), orNullIsrc(isrc), cleanNumericString(upc), parseDateFlexible(releaseDate), orNull(providerOtw), orNull(notas)],
      newId("opt", n)
    );
  }
  console.log(`op_temp: ${n} filas de origen procesadas`);
}

console.log(`\nInsertados: ${inserted}, ya existían (sin tocar): ${skipped}`);
