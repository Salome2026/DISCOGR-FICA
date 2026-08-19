import type { ArCompatibility, ArScoreBreakdown } from "@discografica/shared/types/ar";

// The score is always a deterministic function of real, already-fetched
// numbers — no LLM involved anywhere in this file, and none should ever be
// added here. Gemini's role (later phases) is limited to narrating a score
// that already exists, never computing or adjusting it.
export const SCORING_VERSION = "v1";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// 0-40 points from % growth over the given window, clamped so a single
// huge spike doesn't blow past the component budget — 50%+ growth already
// maxes it out, there's no extra credit for going further.
function growthPoints(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous <= 0) return null;
  const pct = (current - previous) / previous;
  return Math.round(clamp(pct / 0.5, 0, 1) * 40);
}

// 0-20 points — real cross-source corroboration only. sourceCount is how
// many independent sources (Chartmetric, YouTube, Apple Music, a manual
// TikTok observation) currently back this subject; 1 source earns nothing,
// each additional source adds 10, capped at 20.
function crossSourcePoints(sourceCount: number): number {
  return clamp((sourceCount - 1) * 10, 0, 20);
}

// 0-25 points from the deterministic catalog cross-reference — a real
// match with collab history is worth more than a bare sello guess.
function compatibilityPoints(compat: ArCompatibility | null): number | null {
  if (!compat) return null;
  if (compat.matchedArtists.length === 0) return 0;
  const best = compat.matchedArtists[0];
  let pts = 10; // any real roster match
  if (best.sharedGenre) pts += 5;
  if (best.hasCollabHistory) pts += 10;
  return clamp(pts, 0, 25);
}

// 0-15 points, decaying linearly to 0 over two weeks — an opportunity that
// stalled without further growth shouldn't keep showing an inflated score
// just because it was exciting when it was first found.
function freshnessPoints(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.round(clamp(1 - ageDays / 14, 0, 1) * 15);
}

export function computeScore(input: {
  currentMetric: number | null;
  previousMetric: number | null;
  sourceCount: number;
  compatibility: ArCompatibility | null;
  createdAt: string;
}): { score: number; breakdown: ArScoreBreakdown; version: string } {
  const growth = growthPoints(input.currentMetric, input.previousMetric);
  const crossSourceConfirmation = crossSourcePoints(input.sourceCount);
  const labelCompatibility = compatibilityPoints(input.compatibility);
  const freshness = freshnessPoints(input.createdAt);

  const parts = [growth, crossSourceConfirmation, labelCompatibility, freshness].filter(
    (p): p is number => p != null
  );
  const score = parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0)) : 0;

  return {
    score: clamp(score, 0, 100),
    breakdown: { growth, crossSourceConfirmation, labelCompatibility, freshness },
    version: SCORING_VERSION,
  };
}
