import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { docusignConfigured } from "@/lib/docusign";
import { syncNewSignedDocuments } from "@/lib/legalDocusignSync";

// Same sync the hourly cron runs, triggerable on demand — for the initial
// backfill and for whenever Legal doesn't want to wait up to an hour.
export async function POST() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!docusignConfigured()) {
    return NextResponse.json({ error: "DocuSign no está configurado todavía." }, { status: 400 });
  }

  try {
    const result = await syncNewSignedDocuments();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo sincronizar." },
      { status: 502 }
    );
  }
}
