import { NextResponse } from "next/server";
import { getRankingLatest, getLastSyncRun } from "@/lib/db/listeners";

export async function GET() {
  try {
    const [ranking, lastRun] = await Promise.all([getRankingLatest(), getLastSyncRun()]);
    return NextResponse.json({ ranking, lastRun });
  } catch (err) {
    return NextResponse.json(
      {
        ranking: [],
        lastRun: null,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo conectar a la base de datos histórica.",
      },
      { status: 200 }
    );
  }
}
