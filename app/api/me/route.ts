import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveModules } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { getUserPhotoUrl } from "@/lib/db/users";

export async function GET() {
  const session = await auth();
  const user = session?.user as
    | { email?: string; name?: string; roles?: Role[]; accountType?: string; invalid?: boolean; totpEnabled?: boolean }
    | undefined;
  const roles = user?.roles ?? [];
  if (!user?.email || roles.length === 0 || user.invalid) {
    return NextResponse.json({ authenticated: false, home: "/" });
  }
  const photoUrl = await getUserPhotoUrl(user.email);
  const modules = resolveModules(roles);
  return NextResponse.json({
    authenticated: true,
    email: user.email,
    name: user.name,
    roles,
    accountType: user.accountType,
    totpEnabled: user.totpEnabled ?? false,
    photoUrl,
    modules,
    home: modules.length === 1 ? modules[0].home : null,
  });
}
