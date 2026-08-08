"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import { hasPermission, type SessionUser } from "@/lib/permissions";

type Playlist = {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  sello: string | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  followerCount: number | null;
  trackCount: number | null;
  lastSyncedAt: string | null;
};

function PlaylistsContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_playlists");
  const searchParams = useSearchParams();
  const router = useRouter();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d: { configured: boolean; playlists: Playlist[]; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setConfigured(d.configured);
        setPlaylists(d.playlists ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las playlists."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connected = searchParams.get("connected");
  const spotifyAccount = searchParams.get("spotify_account");
  const spotifyError = searchParams.get("spotify_error");

  useEffect(() => {
    if (connected || spotifyError) {
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("spotify_account");
      url.searchParams.delete("spotify_error");
      router.replace(url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-.03em",
                margin: 0,
                background: "linear-gradient(180deg,var(--text-1) 30%,var(--text-2) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Playlists de Spotify
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5 }}>
              {configured ? `${playlists.length} playlist${playlists.length === 1 ? "" : "s"} conectada${playlists.length === 1 ? "" : "s"}` : "Sin conectar todavía"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={load} style={ghostBtn} disabled={loading}>
              {loading ? "Actualizando..." : "↻ Actualizar"}
            </button>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} style={ghostBtn}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {connected === "1" && (
          <div style={banner("good")}>
            ✓ Spotify conectado{spotifyAccount ? ` — cuenta: ${spotifyAccount}` : ""}
          </div>
        )}
        {spotifyError && (
          <div style={banner("crit")}>
            No se pudo conectar con Spotify ({spotifyError}). Probá de nuevo.
          </div>
        )}
        {error && <div style={banner("crit")}>{error}</div>}

        {configured === false && (
          <div
            style={{
              background: "var(--glass-bg-strong)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              padding: "2.5rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600 }}>Todavía no conectamos la cuenta de Spotify del sello</div>
            <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 420 }}>
              Conectá una vez la cuenta real de Spotify de VPO Corp para ver y gestionar sus playlists desde acá.
            </p>
            {canEdit ? (
              <a href="/api/spotify/authorize" style={primaryBtn}>
                Conectar Spotify
              </a>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>Pedile a un usuario de Marketing que la conecte.</p>
            )}
          </div>
        )}

        {configured && playlists.length === 0 && !loading && (
          <div style={{ color: "var(--text-3)", fontSize: 13, padding: "2rem 0", textAlign: "center" }}>
            La cuenta está conectada pero todavía no tiene playlists.
          </div>
        )}

        {configured && playlists.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {playlists.map((p) => (
              <a
                key={p.id}
                href={p.spotifyUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 14,
                  padding: 12,
                  textDecoration: "none",
                  color: "var(--text-1)",
                  backdropFilter: "blur(var(--glass-blur)) saturate(1.7)",
                  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.7)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 10,
                    background: p.coverImageUrl ? `url(${p.coverImageUrl}) center/cover` : "var(--bg-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-3)",
                    fontSize: 11,
                  }}
                >
                  {!p.coverImageUrl && "Sin portada"}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)", display: "flex", gap: 8 }}>
                  <span>{p.trackCount ?? 0} temas</span>
                  <span>·</span>
                  <span>{p.followerCount != null ? `${p.followerCount} seguidores` : "seguidores: —"}</span>
                </div>
                {p.genre && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      fontSize: 10.5,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--accent-glass-bg)",
                      border: "1px solid var(--accent-glass-border)",
                      color: "var(--text-2)",
                    }}
                  >
                    {p.genre}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 999,
  padding: "8px 14px",
  color: "var(--text-2)",
  fontSize: 12.5,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)",
  border: "1px solid var(--accent-glass-border)",
  borderRadius: 10,
  padding: "11px 20px",
  color: "var(--text-1)",
  fontWeight: 600,
  fontSize: 13.5,
  textDecoration: "none",
  cursor: "pointer",
};

function banner(kind: "good" | "crit"): React.CSSProperties {
  return {
    background: kind === "good" ? "var(--good-bg)" : "var(--crit-bg)",
    color: kind === "good" ? "var(--good-ink)" : "var(--crit-ink)",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
  };
}

export default function PlaylistsPage() {
  return (
    <RequirePermission need="ver_playlists">
      <PlaylistsContent />
    </RequirePermission>
  );
}
