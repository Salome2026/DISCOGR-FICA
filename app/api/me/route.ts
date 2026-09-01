import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { homeFor } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { getUserPhotoUrl } from "@/lib/db/users";

export async function GET() {
  const session = await auth();
  const user = session?.user as
    | { email?: string; name?: string; role?: Role | null; accountType?: string; invalid?: boolean; totpEnabled?: boolean }
    | undefined;
  if (!user?.email || !user.role || user.invalid) {
    return NextResponse.json({ authenticated: false, home: "/" });
  }
  const photoUrl = await getUserPhotoUrl(user.email);
  return NextResponse.json({
    authenticated: true,
    email: user.email,
    name: user.name,
    role: user.role,
    accountType: user.accountType,
    totpEnabled: user.totpEnabled ?? false,
    photoUrl,
    home: homeFor(user.role),
  });
}
