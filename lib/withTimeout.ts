// Never let a slow/unavailable external call (Chartmetric, YouTube, Gemini,
// etc.) eat into a route's time budget — fall back to null and keep going
// with whatever the platform already has.
export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([
      p,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}
