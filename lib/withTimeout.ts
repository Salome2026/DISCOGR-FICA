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

// Variant for request paths that need to tell a real failure apart from a
// timeout (withTimeout() above collapses both into `null`, which is right
// for "keep going with less data" background work but wrong when the
// caller's only way to surface an error to the user is its own catch
// block). Rejects with a distinguishable Error on timeout instead of
// swallowing whatever the wrapped promise actually threw.
export class TimeoutError extends Error {
  constructor() {
    super("TIMEOUT");
    this.name = "TimeoutError";
  }
}

export async function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
