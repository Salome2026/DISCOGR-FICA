import { NextRequest, NextResponse } from "next/server";
import { docusignConfigured } from "@/lib/docusign";
import { syncNewSignedDocuments } from "@/lib/legalDocusignSync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!docusignConfigured()) {
    return NextResponse.json(
      { status: "pending", message: "DocuSign no está configurado todavía — sync no ejecutado." },
      { status: 200 }
    );
  }

  try {
    const result = await syncNewSignedDocuments();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
