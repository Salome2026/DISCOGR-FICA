import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { buildAuthorizeUrl } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user || !hasPermission(user, "editar_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ error: "Spotify no está configurado (falta SPOTIFY_CLIENT_ID)." }, { status: 500 });
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/spotify/callback", req.url).toString();
  const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
