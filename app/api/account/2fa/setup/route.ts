import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionUser } from "@/lib/session";
import { setupTotp } from "@/lib/db/users";

// Any authenticated user manages their own 2FA — no permission gate beyond
// "is logged in". Generates a fresh secret every call (overwriting any
// unconfirmed one), so re-opening the setup screen never leaves a stale
// secret the user never actually scanned. QR is rendered server-side so the
// client only ever needs an <img>, not a QR-rendering library of its own.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { secret, uri } = await setupTotp(user.email);
  const qr = await QRCode.toDataURL(uri);
  return NextResponse.json({ secret, uri, qr });
}
