// Scrapes the "PLAYLIST" Google Drive folder without any Drive API
// credentials — same mechanism lib/bookingSheetSync.ts uses for the booking
// agenda sheet (public "anyone with the link" folders/docs, HTML/plain-text
// export endpoints). Verified against the real folder on 2026-08-08: the
// hierarchy is always genre-folder -> Google Docs (never sub-folders, never
// audio files) — each doc IS one playlist, its name is the playlist name,
// and its body is a numbered "N. Título – Artista" list.

export type DriveEntry = { id: string; name: string; kind: "folder" | "doc" | "other" };

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function listDriveFolderEntries(folderId: string): Promise<DriveEntry[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`, { cache: "no-store" });
  const html = await res.text();
  if (!res.ok || html.trimStart().startsWith("<!DOCTYPE html><html><head><title>Error")) {
    throw new Error(`No se pudo leer la carpeta de Drive ${folderId} (status ${res.status}). ¿Sigue compartida como "cualquiera con el enlace"?`);
  }
  const entries: DriveEntry[] = [];
  const blocks = html.split('<div class="flip-entry" id="entry-').slice(1);
  for (const block of blocks) {
    const id = block.split('"', 1)[0];
    const hrefMatch = block.match(/<a href="([^"]+)"/);
    const href = hrefMatch?.[1];
    const titleMatch = block.match(/<div class="flip-entry-title">([^<]*)<\/div>/);
    const name = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
    let kind: DriveEntry["kind"] = "other";
    if (href?.includes("/folders/")) kind = "folder";
    else if (href?.includes("/document/")) kind = "doc";
    entries.push({ id, name, kind });
  }
  return entries;
}

export type PlaylistDocEntry = { title: string; artist: string };

const INVISIBLE_RE = /[⁠﻿​‌‍]/g;
// En/em dash first (the format Google Docs' autocorrect actually produces),
// plain hyphen only as a fallback and only with mandatory spacing on both
// sides — otherwise a title like "80-90" would get chopped at the hyphen.
const DASH_RE = /^(\d+)[.)]\s*\*?(.+?)\*?\s*[–—]\s*(.+)$/;
const HYPHEN_RE = /^(\d+)[.)]\s*\*?(.+?)\*?\s+-\s+(.+)$/;

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Parses the plain-text export of one playlist doc into {title, artist}
// pairs. Skips any line that isn't a numbered entry (section headers like
// "🔥 Clásicos del Reggaetón", blank lines) and dedupes repeated entries
// within the same doc (some docs list the same song more than once).
export function parsePlaylistDocText(text: string): PlaylistDocEntry[] {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const out: PlaylistDocEntry[] = [];
  for (const raw of lines) {
    const line = raw.replace(INVISIBLE_RE, "").trim();
    if (!line) continue;
    const m = DASH_RE.exec(line) || HYPHEN_RE.exec(line);
    if (!m) continue;
    const title = m[2].trim();
    const artist = m[3].trim();
    if (!title || !artist) continue;
    const key = `${normalizeKey(title)}|${normalizeKey(artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, artist });
  }
  return out;
}

export async function parsePlaylistDoc(docId: string): Promise<PlaylistDocEntry[]> {
  const res = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`No se pudo leer el documento ${docId} (status ${res.status}).`);
  }
  return parsePlaylistDocText(text);
}

export const PLAYLIST_ROOT_FOLDER_ID = "1XcgeTTahslaO9W3oyXVKv64WdXpTa7vO";

// Folders found directly inside the root that are NOT genre/playlist
// folders — confirmed by manually inspecting their contents (not guessed
// from the name): event-equipment rental receipts/WhatsApp photos, a single
// stray untitled spreadsheet, and an empty folder.
const EXCLUDED_FOLDER_IDS = new Set([
  "1MRF0ec746gyFdbdNtrASIrZma7AqbEyd", // "Diego Gabriel vs Nehuen Lozano vs Jean Claudio/Tibbass"
  "1BRi_gEWwL7hN4JWDoNuIQWbQf4HTGxU6", // "PLAYLIST - IA "
  "1yXnOB505Bj_vaWgzY1Ht31MypjjSInBf", // "RIZZVOR"
]);

export type PlaylistDocRef = { genre: string; genreFolderId: string; docId: string; docName: string };

// Flat list of every real playlist doc under the root — always a fixed
// two-level hierarchy (genre folder -> docs), no recursion needed, per the
// structure confirmed against the live Drive folder.
export async function discoverPlaylistDocs(rootFolderId: string = PLAYLIST_ROOT_FOLDER_ID): Promise<PlaylistDocRef[]> {
  const genreFolders = (await listDriveFolderEntries(rootFolderId)).filter(
    (e) => e.kind === "folder" && !EXCLUDED_FOLDER_IDS.has(e.id)
  );
  const out: PlaylistDocRef[] = [];
  for (const folder of genreFolders) {
    const entries = await listDriveFolderEntries(folder.id);
    for (const e of entries) {
      if (e.kind !== "doc") continue;
      out.push({ genre: folder.name, genreFolderId: folder.id, docId: e.id, docName: e.name.trim() });
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}
