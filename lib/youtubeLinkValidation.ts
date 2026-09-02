// Matches youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, and the
// music.youtube.com / m.youtube.com variants of the same three shapes —
// covers videoclip, visualizer, lyric video, Short, or any other YouTube
// link a PM might paste for a lanzamiento.
const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.|music\.|m\.)?(youtube\.com\/(watch\?(?:.*&)?v=[\w-]+|shorts\/[\w-]+)|youtu\.be\/[\w-]+)([&?#].*)?$/i;

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url.trim());
}
