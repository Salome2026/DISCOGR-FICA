import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { confirmTotp } from "@/lib/db/users";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = body?.code as string | undefined;
  if (!code) return NextResponse.json({ error: "Falta el código." }, { status: 400 });

  const result = await confirmTotp(user.email, code);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ backupCodes: result.backupCodes });
}
