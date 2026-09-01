"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";

export const PM_STYLES = `
  .pmx-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 5rem; }
  .pmx-inner { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .pmx-inner.pmx-home { max-width: 1800px; }
  .pmx-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:1.75rem; flex-wrap:wrap; }
  .pmx-back { background:none; border:none; color:var(--text-3); font-size:12.5px; cursor:pointer; padding:0; margin-bottom:10px; display:inline-block; text-decoration:none; }
  .pmx-kicker {
    font-size:32px; font-weight:700; letter-spacing:-.03em; text-transform:uppercase; margin-bottom:4px;
    background:linear-gradient(180deg,var(--text-1) 30%,var(--text-2) 100%);
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  }
  .pmx-title { font-size:16px; font-weight:600; margin:0; color:var(--text-2); letter-spacing:-.01em; }
  .pmx-sub { font-size:13px; color:var(--text-3); margin-top:4px; }
  .pmx-signout { background: var(--glass-bg); border:1px solid var(--glass-border); border-radius:8px; padding:8px 16px; color:var(--text-2); cursor:pointer; font-size:12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }

  .pmx-topbar-right { display:flex; align-items:center; gap:14px; }
  .pmx-profile-avatar { position:relative; width:44px; height:44px; border-radius:50%; cursor:pointer; flex-shrink:0; }
  .pmx-profile-avatar img { width:44px; height:44px; border-radius:50%; object-fit:cover; display:block; border:2px solid var(--glass-border); }
  .pmx-profile-avatar-fallback { width:44px; height:44px; border-radius:50%; background:var(--glass-bg); border:2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:var(--text-2); }
  .pmx-profile-avatar:hover img, .pmx-profile-avatar:hover .pmx-profile-avatar-fallback { border-color:var(--accent); }
  .pmx-profile-avatar input[type="file"] { display:none; }

  .pmx-home-buttons { display:grid; grid-template-columns: repeat(4, 1fr); gap:1.25rem; }
  @media (max-width:900px) { .pmx-home-buttons { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width:520px) { .pmx-home-buttons { grid-template-columns: 1fr; } }

  .pmx-section-title { color:#fff; font-weight:800; font-size:21px; letter-spacing:-.01em; margin-bottom:14px; }
  .pmx-calendar-row { display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; align-items:start; }
  @media (max-width:1100px) { .pmx-calendar-row { grid-template-columns: 1fr; } }
  .pmx-big-btn {
    display:flex; flex-direction:column; gap:8px; align-items:flex-start; text-align:left; justify-content:center;
    min-height: 168px;
    background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 2rem 1.75rem; text-decoration:none; color:var(--text-1);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); cursor:pointer;
    transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .pmx-big-btn:hover { border-color: var(--accent); transform: translateY(-2px); }
  .pmx-big-btn h2 { font-size:19px; font-weight:700; margin:0; }
  .pmx-big-btn p { font-size:12.5px; color:var(--text-3); margin:0; line-height:1.5; }

  .pmx-card { background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-lg); padding:1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }

  .pmx-fono-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px; }
  .pmx-fono-card {
    display:flex; flex-direction:column; gap:10px;
    background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-lg);
    padding:1.1rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass);
  }
  .pmx-fono-title { font-size:15px; font-weight:700; }
  .pmx-fono-meta { font-size:12px; color:var(--text-3); }
  .pmx-fono-tasks { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
  .pmx-fono-task { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .pmx-fono-task-label { font-size:12px; color:var(--text-2); }
  .pmx-badge { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 10px; border-radius:100px; flex-shrink:0; }
  .pmx-badge.pendiente { background: var(--warn-bg); color: var(--warn-ink); }
  .pmx-badge.completado { background: var(--good-bg); color: var(--good-ink); }
  .pmx-badge.no-corresponde { background: var(--bg-2); color: var(--text-3); }
  .pmx-fono-task-btn { background:transparent; border:1px solid var(--line-soft); border-radius:6px; padding:4px 10px; color:var(--text-2); cursor:pointer; font-size:11.5px; text-decoration:none; }
  .pmx-fono-task-btn:hover { border-color:var(--accent-color); color:var(--text-1); }
  .pmx-fono-footer { display:flex; justify-content:flex-end; margin-top:2px; }

  .pmx-artist-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:18px; }
  .pmx-artist-card {
    display:flex; align-items:center; gap:16px; text-decoration:none; color:var(--text-1);
    background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-lg);
    padding:1.4rem 1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .pmx-artist-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .pmx-artist-avatar-img { width:64px; height:64px; border-radius:50%; object-fit:cover; flex-shrink:0; }
  .pmx-artist-avatar-fallback { width:64px; height:64px; border-radius:50%; background:var(--bg-2); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:var(--text-2); flex-shrink:0; }
  .pmx-artist-card-name { font-size:18px; font-weight:700; }
  .pmx-artist-card-sello { font-size:14px; color:var(--text-3); margin-top:4px; }
`;

export function PMShell({
  title,
  subtitle,
  backHref,
  homeMaxWidth = false,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  homeMaxWidth?: boolean;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function loadPhoto() {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setPhotoUrl(d.photoUrl ?? null));
  }
  useEffect(loadPhoto, []);

  async function handlePhotoChange(file: File) {
    setUploading(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/me/photo" });
      await fetch("/api/me/photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: blob.url }),
      });
      setPhotoUrl(blob.url);
    } finally {
      setUploading(false);
    }
  }

  const name = session?.user?.name ?? session?.user?.email ?? "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="pmx-root bg-atmosphere">
      <style>{PM_STYLES}</style>
      <div className={`pmx-inner ${homeMaxWidth ? "pmx-home" : ""}`}>
        <div className="pmx-topbar">
          <div>
            {backHref && (
              <Link href={backHref} className="pmx-back">
                ← Volver
              </Link>
            )}
            <div className="pmx-kicker">Project Manager</div>
            <h1 className="pmx-title">{title}</h1>
            <div className="pmx-sub">{subtitle ?? session?.user?.email}</div>
          </div>
          <div className="pmx-topbar-right">
            <label className="pmx-profile-avatar" title={uploading ? "Subiendo..." : "Cambiar foto de perfil"}>
              {photoUrl ? <img src={photoUrl} alt={name} /> : <div className="pmx-profile-avatar-fallback">{initials || "?"}</div>}
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoChange(f);
                }}
              />
            </label>
            <button className="pmx-signout" onClick={() => signOut({ callbackUrl: "/" })}>
              Cerrar sesión
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
