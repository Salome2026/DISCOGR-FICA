import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { exchangeCodeForTokens, getMeWithToken } from "@/lib/spotify";
import { saveSpotifyConnection } from "@/lib/db/spotifySettings";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user || !hasPermission(user, "editar_playlists")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const spotifyError = url.searchParams.get("error");
  const cookieState = req.cookies.get("spotify_oauth_state")?.value;

  if (spotifyError) {
    return NextResponse.redirect(new URL(`/panel/playlists?spotify_error=${encodeURIComponent(spotifyError)}`, req.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/panel/playlists?spotify_error=state_mismatch", req.url));
  }

  try {
    const redirectUri = new URL("/api/spotify/callback", req.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    // Who actually connected — surfaced back to the admin so a wrong
    // (personal) Spotify account is obvious immediately, not discovered
    // later once playlists show up empty/unexpected.
    const me = await getMeWithToken(tokens.access_token);

    await saveSpotifyConnection({
      refreshToken: tokens.refresh_token,
      spotifyUserId: me.id,
      displayName: me.display_name ?? null,
      scope: tokens.scope,
      connectedBy: user.email,
      connectedAt: new Date().toISOString(),
    });

    const res = NextResponse.redirect(
      new URL(`/panel/playlists?connected=1&spotify_account=${encodeURIComponent(me.display_name || me.id)}`, req.url)
    );
    res.cookies.delete("spotify_oauth_state");
    return res;
  } catch (err) {
    console.error("Spotify OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/panel/playlists?spotify_error=exchange_failed", req.url));
  }
}
