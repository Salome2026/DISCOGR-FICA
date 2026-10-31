import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";

// Seguimiento es una vista de dirección: admin y management.
export async function seguimientoUser(req: NextRequest): Promise<{ email: string } | null> {
  const user = await getSessionUser(req);
  if (!user?.email) return null;
  const roles = user.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("management")) return null;
  return { email: user.email };
}
