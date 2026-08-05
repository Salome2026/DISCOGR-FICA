import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { docusignConfigured, listCompletedEnvelopes } from "@/lib/docusign";
import { listContracts } from "@/lib/db/legalContracts";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!docusignConfigured()) {
    return NextResponse.json({ error: "DocuSign no está configurado todavía." }, { status: 400 });
  }

  try {
    const [envelopes, contracts] = await Promise.all([listCompletedEnvelopes(), listContracts()]);
    const importedIds = new Set(contracts.map((c) => c.docusignEnvelopeId).filter(Boolean));
    const withImportFlag = envelopes.map((e) => ({ ...e, alreadyImported: importedIds.has(e.envelopeId) }));
    return NextResponse.json({ envelopes: withImportFlag });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo conectar con DocuSign." },
      { status: 502 }
    );
  }
}
