import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { canCmAccessAccount, getAccount } from "@/lib/db/cmAccounts";
import { generateContentSuggestions, cmSuggestionsConfigured } from "@/lib/cmSuggestions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, id))) {
    return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
  }
  if (!cmSuggestionsConfigured()) {
    return NextResponse.json({ error: "Gemini no está configurado." }, { status: 400 });
  }
  const account = await getAccount(id);
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  try {
    const result = await generateContentSuggestions(id, account.name);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error generando sugerencias." }, { status: 502 });
  }
}
