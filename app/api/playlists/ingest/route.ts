import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { discoverPlaylistDocs, parsePlaylistDoc, type PlaylistDocRef } from "@/lib/googleDriveScrape";
import { searchTrackByTitleArtist, createPlaylist, addTracksToPlaylist, uploadPlaylistCoverImage } from "@/lib/spotify";
import { findPlaylistByDriveDocId, insertIngestedPlaylist } from "@/lib/db/spotifyPlaylists";
import { logTrackAdded } from "@/lib/db/spotifyPlaylistTracks";
import { findCoverUrlByDocId } from "@/lib/spotifyCoverManifest";
import { toSpotifyCoverBase64 } from "@/lib/imageResize";

// Below this, a "match" is more likely noise than signal — the entry gets
// logged as skipped instead of adding a wrong track to a real playlist.
const MATCH_THRESHOLD = 0.35;

// Processes as many not-yet-ingested Drive docs as fit in one invocation,
// then returns — the client calls this repeatedly until `done`. Doing
// discovery once per call (not once per doc) and budgeting wall-clock time
// per call is what keeps this safe under a serverless function's time limit
// regardless of whether the project is on Hobby or Pro.
const TIME_BUDGET_MS = 45_000;

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

async function ingestOneDoc(doc: PlaylistDocRef, actorEmail: string): Promise<{ trackCount: number; entryCount: number }> {
  const entries = await parsePlaylistDoc(doc.docId);
  if (entries.length === 0) {
    throw new Error("El documento no tiene ninguna canción listada — no se crea la playlist.");
  }

  const matched: { title: string; artist: string; trackId: string; uri: string; score: number }[] = [];
  for (const entry of entries) {
    const match = await searchTrackByTitleArtist(entry.title, entry.artist);
    if (match && match.score >= MATCH_THRESHOLD) {
      matched.push({ title: entry.title, artist: entry.artist, trackId: match.id, uri: match.uri, score: match.score });
    }
  }

  const created = await createPlaylist(
    doc.docName,
    `Generado automáticamente desde Drive · género: ${doc.genre}`,
    false
  );

  // The label already designed a real cover for this exact playlist doc —
  // use it directly, no AI generation needed (that path is blocked on
  // billing anyway, see task #99/#100).
  let coverImageUrl: string | null = null;
  const manifestUrl = findCoverUrlByDocId(doc.docId);
  if (manifestUrl) {
    try {
      const imgRes = await fetch(manifestUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const base64 = await toSpotifyCoverBase64(buf);
      await uploadPlaylistCoverImage(created.id, base64);
      coverImageUrl = manifestUrl;
    } catch (err) {
      console.error(`Cover upload failed for "${doc.docName}":`, err);
    }
  }

  // Must exist before logTrackAdded() below — spotify_playlist_tracks has a
  // foreign key on spotify_playlists(id).
  await insertIngestedPlaylist({
    id: created.id,
    name: doc.docName,
    genre: doc.genre,
    driveFolderId: doc.genreFolderId,
    driveFolderPath: `PLAYLIST/${doc.genre}`,
    driveDocId: doc.docId,
    coverImageUrl,
    coverSource: coverImageUrl ? "manual" : null,
    spotifyUrl: created.external_urls.spotify,
    trackCount: matched.length,
    createdBy: actorEmail,
  });

  if (matched.length > 0) {
    await addTracksToPlaylist(created.id, matched.map((m) => m.uri));
  }
  for (let i = 0; i < matched.length; i++) {
    const m = matched[i];
    await logTrackAdded({
      playlistId: created.id,
      spotifyTrackId: m.trackId,
      position: i,
      source: "drive_ingest",
      matchScore: m.score,
      driveTitle: m.title,
      driveArtist: m.artist,
      addedBy: actorEmail,
    });
  }

  return { trackCount: matched.length, entryCount: entries.length };
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : null;

  const startedAt = Date.now();
  const allDocs = await discoverPlaylistDocs();

  let processed = 0;
  let alreadyDone = 0;
  const created: { name: string; genre: string; trackCount: number; entryCount: number }[] = [];
  const failed: { name: string; genre: string; error: string }[] = [];
  let ranOutOfTime = false;

  for (const doc of allDocs) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      ranOutOfTime = true;
      break;
    }
    if (limit != null && processed >= limit) {
      ranOutOfTime = true; // reuse the same "stop early, more remain" signal
      break;
    }
    const existing = await findPlaylistByDriveDocId(doc.docId);
    if (existing) {
      alreadyDone++;
      continue;
    }
    try {
      const result = await ingestOneDoc(doc, user.email);
      created.push({ name: doc.docName, genre: doc.genre, ...result });
      processed++;
    } catch (err) {
      failed.push({ name: doc.docName, genre: doc.genre, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const totalDone = alreadyDone + processed + failed.length;
  const remaining = allDocs.length - totalDone;

  return NextResponse.json({
    totalDocs: allDocs.length,
    processed,
    alreadyDone,
    failed,
    created,
    remaining: Math.max(remaining, 0),
    done: remaining <= 0 && !ranOutOfTime,
  });
}
