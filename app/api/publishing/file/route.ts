import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { streamPrivateBlob } from "@/lib/blobProxy";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const { rows } = await sql`SELECT 1 FROM publishing_artists WHERE documento_url = ${url} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

  return streamPrivateBlob(url);
}
