"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";

type Persona = { name: string; avatarUrl: string | null; tone: string; description: string };
type AgentStatus = { state: string; detail: string | null; updatedAt: string };
type Reference = { id: string; title: string; status: string; score: number | null };
type Turn = { id: string | number; role: "user" | "model"; content: string; references: Reference[] };

const STATE_LABELS: Record<string, string> = {
  idle: "En línea",
  scanning_roster: "Revisando el roster propio",
  scanning_catalog: "Revisando el catálogo",
  detectando_alertas: "Buscando alertas nuevas",
  preparando_resumen: "Preparando el resumen del día",
};

const STYLES = `
  .araw-bubble { position: fixed; right: 24px; bottom: 24px; z-index: 60; width: 56px; height: 56px; border-radius: 50%;
    background: var(--accent-gradient); border: none; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: var(--accent-ink);
    overflow: hidden; }
  .araw-bubble img { width: 100%; height: 100%; object-fit: cover; }
  .araw-dot { position: absolute; top: 2px; right: 2px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--bg-1); }
  .araw-dot.busy { background: var(--warn-ink); animation: araw-pulse 1.4s ease-in-out infinite; }
  .araw-dot.idle { background: var(--good-ink); }
  @keyframes araw-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  .araw-panel { position: fixed; right: 24px; bottom: 92px; z-index: 60; width: 380px; max-width: calc(100vw - 32px);
    height: 520px; max-height: calc(100vh - 140px); background: var(--bg-1); border: 1px solid var(--line-soft);
    border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; }
  .araw-header { padding: 14px 16px; border-bottom: 1px solid var(--line-soft); display: flex; align-items: center; gap: 10px; }
  .araw-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center;
    justify-content: center; font-weight: 700; font-size: 13px; color: var(--accent-ink); overflow: hidden; flex-shrink: 0; }
  .araw-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .araw-header-name { font-size: 14px; font-weight: 700; color: var(--text-1); }
  .araw-header-status { font-size: 11.5px; color: var(--text-3); }
  .araw-close { margin-left: auto; background: transparent; border: none; color: var(--text-3); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
  .araw-messages { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .araw-msg { max-width: 85%; font-size: 13px; line-height: 1.5; padding: 9px 12px; border-radius: 12px; white-space: pre-wrap; }
  .araw-msg.user { align-self: flex-end; background: var(--accent-glass-bg); border: 1px solid var(--accent-glass-border); color: var(--text-1); }
  .araw-msg.model { align-self: flex-start; background: var(--bg-2); border: 1px solid var(--line-soft); color: var(--text-1); }
  .araw-refs { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
  .araw-ref-chip { font-size: 11px; padding: 4px 8px; border-radius: 6px; background: var(--glass-bg); border: 1px solid var(--glass-border);
    color: var(--text-2); text-decoration: none; cursor: pointer; }
  .araw-empty { font-size: 12.5px; color: var(--text-3); text-align: center; margin: auto 0; padding: 0 20px; line-height: 1.6; }
  .araw-input-row { border-top: 1px solid var(--line-soft); padding: 10px; display: flex; gap: 8px; }
  .araw-input { flex: 1; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px;
    color: var(--text-1); font-size: 13px; font-family: inherit; resize: none; }
  .araw-send { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 0 16px; color: var(--accent-ink);
    font-weight: 700; font-size: 13px; cursor: pointer; }
  .araw-send:disabled { opacity: .5; cursor: default; }
  .araw-error { font-size: 12px; color: var(--crit-ink); padding: 0 16px 8px; }
`;

function Avatar({ persona, size }: { persona: Persona; size: number }) {
  const initials = persona.name.slice(0, 2).toUpperCase();
  if (persona.avatarUrl) {
    return <img src={persona.avatarUrl} alt={persona.name} style={{ width: size, height: size, objectFit: "cover" }} />;
  }
  return <>{initials}</>;
}

export default function ArAgentWidget() {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const invalid = (session?.user as { invalid?: boolean } | undefined)?.invalid;

  const canUse = sessionStatus === "authenticated" && !invalid && !!user && hasPermission(user, "editar_ar");
  const hidden = pathname === "/" || !canUse;

  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const existing = window.sessionStorage.getItem("ar_chat_session_id");
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.sessionStorage.setItem("ar_chat_session_id", fresh);
    return fresh;
  }, []);

  function loadStatus() {
    fetch("/api/ar/agent-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setPersona(d.persona);
        setAgentStatus(d.status);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (hidden) return;
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  useEffect(() => {
    if (!open || loadedHistory || !sessionId) return;
    setLoadedHistory(true);
    fetch(`/api/ar/chat?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.turns) setTurns(d.turns);
      })
      .catch(() => {});
  }, [open, loadedHistory, sessionId]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [turns, sending]);

  if (hidden) return null;

  async function send() {
    const message = input.trim();
    if (!message || sending) return;
    setInput("");
    setError(null);
    setTurns((t) => [...t, { id: `local-${Date.now()}`, role: "user", content: message, references: [] }]);
    setSending(true);
    try {
      const res = await fetch("/api/ar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo enviar el mensaje.");
      setTurns((t) => [...t, { id: `local-${Date.now()}-r`, role: "model", content: d.reply, references: d.references ?? [] }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSending(false);
    }
  }

  const displayPersona: Persona = persona ?? { name: "Agente A&R", avatarUrl: null, tone: "", description: "" };
  const isBusy = !!agentStatus && agentStatus.state !== "idle";

  return (
    <>
      <style>{STYLES}</style>
      {open && (
        <div className="araw-panel">
          <div className="araw-header">
            <div className="araw-avatar">
              <Avatar persona={displayPersona} size={32} />
            </div>
            <div>
              <div className="araw-header-name">{displayPersona.name}</div>
              <div className="araw-header-status">{agentStatus ? STATE_LABELS[agentStatus.state] ?? agentStatus.state : "..."}</div>
            </div>
            <button className="araw-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
          </div>
          <div className="araw-messages" ref={messagesRef}>
            {turns.length === 0 && (
              <div className="araw-empty">
                Preguntale a {displayPersona.name} qué encontró esta semana, o por el estado de una categoría/género puntual — responde solo con datos reales del sistema.
              </div>
            )}
            {turns.map((t) => (
              <div key={t.id} className={`araw-msg ${t.role}`}>
                {t.content}
                {t.references.length > 0 && (
                  <div className="araw-refs">
                    {t.references.map((r) => (
                      <a key={r.id} href={`/panel/ar/${r.id}`} target="_blank" rel="noreferrer" className="araw-ref-chip">
                        {r.title}{r.score != null ? ` · score ${r.score}` : ""}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && <div className="araw-msg model">Pensando...</div>}
          </div>
          {error && <div className="araw-error">{error}</div>}
          <div className="araw-input-row">
            <textarea
              className="araw-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escribí tu pregunta..."
            />
            <button className="araw-send" onClick={send} disabled={sending || !input.trim()}>
              Enviar
            </button>
          </div>
        </div>
      )}
      <button className="araw-bubble" onClick={() => setOpen((o) => !o)} aria-label="Chatear con el agente de A&R">
        <Avatar persona={displayPersona} size={56} />
        <span className={`araw-dot ${isBusy ? "busy" : "idle"}`} />
      </button>
    </>
  );
}
