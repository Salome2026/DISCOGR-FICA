import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAssignedArtists } from "@/lib/db/users";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await getAssignedArtists(email);
  return NextResponse.json({ artists });
}
