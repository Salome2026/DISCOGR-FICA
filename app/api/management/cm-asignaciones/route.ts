import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAllAccounts, upsertAccountAssignment, getAccountAssignment } from "@/lib/db/cmAccounts";
import { listUsersByRole } from "@/lib/db/users";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const [accounts, cms] = await Promise.all([listAllAccounts(), listUsersByRole("community_manager")]);
  const withAssignment = await Promise.all(
    accounts.map(async (a) => ({ ...a, assignment: await getAccountAssignment(a.id) }))
  );
  return NextResponse.json({ accounts: withAssignment, cms: cms.map((u) => ({ email: u.email, name: u.name })) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const cmEmail = typeof body?.cmEmail === "string" ? body.cmEmail.trim().toLowerCase() : "";
  if (!accountId || !cmEmail) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  const previous = await getAccountAssignment(accountId);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (previous && previous.cmEmail !== cmEmail && !reason) {
    return NextResponse.json({ error: "Hay que indicar un motivo para reasignar esta cuenta." }, { status: 400 });
  }
  await upsertAccountAssignment(accountId, cmEmail, reason || null, user.email);
  return NextResponse.json({ ok: true });
}
