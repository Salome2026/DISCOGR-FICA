import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";

// Separate from every other module's upload route on purpose — Rizzvor
// Proyectos is its own module and this is the only path that can write
// into its file storage.
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload ?? "otro";
        const isAudio = kind === "audio_wav" || kind === "audio_preview";
        const isImage = kind === "foto_artista" || kind === "portada";
        return {
          allowedContentTypes: isAudio
            ? ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3"]
            : isImage
              ? ["image/png", "image/jpeg"]
              : ["application/pdf", "image/png", "image/jpeg", "audio/wav", "audio/x-wav", "audio/mpeg"],
          maximumSizeInBytes: isAudio ? 700 * 1024 * 1024 : 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uploadedBy: user.email }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al generar el token de subida." },
      { status: 400 }
    );
  }
}
