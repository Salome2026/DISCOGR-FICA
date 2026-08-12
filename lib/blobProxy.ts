import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

// Streams a private Vercel Blob back to an already-authorized caller. Every
// route that calls this has already checked the caller's permission for
// that specific file *before* calling it — this function does no auth
// itself, it just does the actual fetch-and-stream once a route has
// decided the request is allowed.
export async function streamPrivateBlob(url: string): Promise<NextResponse> {
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }
  const filename = result.blob.pathname.split("/").pop() ?? "archivo";
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
