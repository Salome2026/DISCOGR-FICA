"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { STREAMING_PROJECTS } from "@/lib/sellos";

type Track = { streaming_project: string | null };

export default function StreamingsIndex() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/catalog/tracks?sello=Streamings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const c: Record<string, number> = {};
        for (const t of d.tracks as Track[]) {
          if (!t.streaming_project) continue;
          c[t.streaming_project] = (c[t.streaming_project] || 0) + 1;
        }
        setCounts(c);
      })
      .catch(() => {});
  }, []);

  return (
    <RequireRole allow={["admin"]}>
      <div className="dash-root">
        <style>{`
          .dash-root {
            --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
            --line:#544831; --line-soft:#403627;
            --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
            --gold:#e6a94f;
            font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
            background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .proj-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:1.5rem;}
          .proj-card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;text-decoration:none;color:var(--text-1);display:block;}
          .proj-card:hover{background:var(--bg-2);border-color:var(--line);}
          .proj-name{font-size:16px;font-weight:700;margin-bottom:6px;}
          .proj-sub{font-size:12.5px;color:var(--text-3);}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › Streamings
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Streamings</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            Proyectos de streaming de VPO. Cada uno tiene su propio dashboard, igual que un sello.
          </p>

          <div className="proj-grid">
            {STREAMING_PROJECTS.map((p) => (
              <Link key={p} href={`/streamings/${encodeURIComponent(p)}`} className="proj-card">
                <div className="proj-name">{p}</div>
                <div className="proj-sub">
                  {counts ? `${counts[p] ?? 0} fonogramas` : "Cargando..."}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
