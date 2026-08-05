import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { docusignConfigured } from "@/lib/docusign";

// Lets the UI show "DocuSign no está configurado todavía" instead of a
// confusing failed request when the env vars haven't been set up yet.
export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ configured: docusignConfigured() });
}
