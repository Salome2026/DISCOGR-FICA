import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { homeFor } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  const user = session?.user as
    | { email?: string; name?: string; role?: Role | null; accountType?: string; invalid?: boolean }
    | undefined;
  if (!user?.email || !user.role || user.invalid) {
    return NextResponse.json({ authenticated: false, home: "/" });
  }
  return NextResponse.json({
    authenticated: true,
    email: user.email,
    name: user.name,
    role: user.role,
    accountType: user.accountType,
    home: homeFor(user.role),
  });
}
