import sharp from "sharp";

// Spotify's playlist cover-image endpoint requires a base64-encoded JPEG
// under 256KB total. Base64 adds ~37% overhead over the raw bytes, so the
// real budget for the encoded JPEG itself is tighter than 256KB — step
// quality/size down until it fits instead of guessing one setting.
const MAX_BASE64_BYTES = 256 * 1024;

export async function toSpotifyCoverBase64(imageBuffer: Buffer): Promise<string> {
  let size = 1000;
  let quality = 85;
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = await sharp(imageBuffer).resize(size, size, { fit: "cover" }).jpeg({ quality }).toBuffer();
    const base64 = out.toString("base64");
    if (base64.length < MAX_BASE64_BYTES) return base64;
    if (quality > 40) quality -= 15;
    else size = Math.round(size * 0.75);
  }
  const fallback = await sharp(imageBuffer).resize(500, 500, { fit: "cover" }).jpeg({ quality: 35 }).toBuffer();
  return fallback.toString("base64");
}
