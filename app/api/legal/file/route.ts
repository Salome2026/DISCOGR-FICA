import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { streamPrivateBlob } from "@/lib/blobProxy";

// Proxies a private Legal document. Beyond the ver_legal permission check,
// the URL itself must belong to a real legal_contracts/legal_signed_releases/
// legal_external_releases row — otherwise a valid ver_legal session could be
// used to fetch any private blob URL from any other module, if it somehow
// learned that URL. Streaming through the server (never a direct blob link)
// is also what makes "requiere permiso en cada descarga" real instead of a
// permission check that only ran once, at upload time.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const { rows } = await sql`
    SELECT 1 FROM legal_contracts WHERE documento_url = ${url}
    UNION SELECT 1 FROM legal_signed_releases WHERE documento_url = ${url}
    UNION SELECT 1 FROM legal_external_releases WHERE documento_url = ${url}
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

  return streamPrivateBlob(url);
}
