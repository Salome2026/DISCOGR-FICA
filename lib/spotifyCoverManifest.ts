import manifestData from "@/data/spotify-cover-manifest.json";

// Maps a Drive playlist doc (by its stable docId — never by name, since a
// couple of docs across different genres share the exact same name) to the
// real cover image the label already designed for it, hosted on Vercel
// Blob. Built once via a one-off local script that read
// ~/Desktop/PORTADAS PLAYLIST, matched each file to its playlist doc, and
// uploaded everything — see task history, not reproducible from code alone.
type ManifestEntry = { docId: string; url: string };

const manifest = manifestData as ManifestEntry[];
const byDocId = new Map(manifest.map((e) => [e.docId, e.url]));

export function findCoverUrlByDocId(docId: string): string | null {
  return byDocId.get(docId) ?? null;
}
