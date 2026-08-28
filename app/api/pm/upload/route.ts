import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || !role || role === "sin_acceso") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload === "portada" ? "portada" : clientPayload === "letra" ? "letra" : "audio";
        const allowedContentTypes =
          kind === "audio"
            ? ["audio/wav", "audio/x-wav", "audio/wave"]
            : kind === "letra"
              ? ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
              : ["image/png", "image/jpeg"];
        return {
          allowedContentTypes,
          maximumSizeInBytes: kind === "audio" ? 700 * 1024 * 1024 : 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uploadedBy: session.user!.email }),
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
