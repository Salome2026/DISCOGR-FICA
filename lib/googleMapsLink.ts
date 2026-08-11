// Parses common Google Maps share-link shapes into coordinates. No API key
// — regex against the URL after following redirects (needed for shortened
// maps.app.goo.gl / goo.gl/maps links), per the deliberate decision to keep
// Tour Manager free of any Google Maps Platform billing dependency.

export function looksLikeGoogleMapsLink(s: string): boolean {
  return /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s.trim());
}

export async function parseGoogleMapsLink(url: string): Promise<{ lat: number; lng: number } | null> {
  let finalUrl = url;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" },
    });
    finalUrl = res.url || url;
  } catch {
    // network hiccup — still try to regex the original url below
  }

  // Pattern 1: .../@-34.603722,-58.381592,17z...  (most common expanded-URL shape)
  const at = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // Pattern 2: ?q=lat,lng or &destination=lat,lng
  const q = finalUrl.match(/[?&](?:q|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };

  // Pattern 3: !3d<lat>!4d<lng> embedded in /maps/place/.../data=... blobs
  const d = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d) return { lat: parseFloat(d[1]), lng: parseFloat(d[2]) };

  return null;
}
