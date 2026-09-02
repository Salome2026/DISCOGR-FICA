import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import {
  removeAccountAssignment,
  getAccountAssignmentHistory,
  addCollaborator,
  removeCollaborator,
  listCollaboratorsForAccount,
} from "@/lib/db/cmAccounts";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { accountId } = await params;
  const [history, collaborators] = await Promise.all([
    getAccountAssignmentHistory(accountId),
    listCollaboratorsForAccount(accountId),
  ]);
  return NextResponse.json({ history, collaborators });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { accountId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "Hay que indicar un motivo." }, { status: 400 });
  await removeAccountAssignment(accountId, reason, user.email);
  return NextResponse.json({ ok: true });
}

// Cuentas compartidas — mismo mecanismo de colaboradores que Facuu DJ en PM.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { accountId } = await params;
  const body = await req.json().catch(() => null);
  const cmEmail = typeof body?.cmEmail === "string" ? body.cmEmail.trim().toLowerCase() : "";
  if (!cmEmail) return NextResponse.json({ error: "Falta el email de la CM." }, { status: 400 });
  if (body?.action === "add_collaborator") {
    await addCollaborator(accountId, cmEmail, user.email);
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "remove_collaborator") {
    await removeCollaborator(accountId, cmEmail, user.email);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
