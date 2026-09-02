import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAccountsForArtist, canCmAccessAccount } from "@/lib/db/cmAccounts";
import { listContentForAccount } from "@/lib/db/cmContent";
import { listLaunchesForArtist } from "@/lib/db/cmLaunches";
import { getAccountGrowth } from "@/lib/db/cmMetrics";
import { getArtist } from "@/lib/db/artists";

// Vista agregada "por artista o marca": todas las redes vinculadas a este
// artist_id, su contenido y lanzamientos combinados — a diferencia de la
// ficha de cuenta, que muestra una sola red a la vez.
export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const [artist, accounts, launches] = await Promise.all([
    getArtist(artistId),
    listAccountsForArtist(artistId),
    listLaunchesForArtist(artistId),
  ]);

  // Al menos una de las cuentas del artista tiene que ser accesible para
  // esta CM (o ser Management/admin) — si el artista no tiene ninguna
  // cuenta todavía, cualquier CM con ver_cm puede ver la ficha vacía.
  if (accounts.length > 0) {
    const accessible = await Promise.all(accounts.map((a) => canCmAccessAccount({ email: user.email, roles: user.roles }, a.id)));
    if (!accessible.some(Boolean)) {
      return NextResponse.json({ error: "No tenés acceso a ninguna cuenta de este artista." }, { status: 403 });
    }
  }

  const [contentByAccount, growthByAccount] = await Promise.all([
    Promise.all(accounts.map((a) => listContentForAccount(a.id))),
    Promise.all(accounts.map((a) => getAccountGrowth(a.id))),
  ]);

  return NextResponse.json({
    artist: artist ? { id: artist.id, name: artist.name, photoUrl: artist.photoUrl } : { id: artistId, name: artistId, photoUrl: null },
    accounts,
    launches,
    content: accounts.map((a, i) => ({ accountId: a.id, items: contentByAccount[i] })),
    growth: accounts.map((a, i) => ({ accountId: a.id, growth: growthByAccount[i] })),
  });
}
