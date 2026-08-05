"use client";

import { useEffect, useRef, useState } from "react";

export type PlayerTrack = {
  url: string;
  name: string;
  subtitle?: string;
};

export default function AudioPlayerBar({
  tracks,
  startIndex,
  onClose,
}: {
  tracks: PlayerTrack[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = tracks[index];

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex, tracks]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, index]);

  function next() {
    setIndex((i) => (i + 1) % tracks.length);
    setPlaying(true);
  }
  function prev() {
    setIndex((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  }

  if (!track) return null;

  return (
    <div className="rzp-player-bar">
      <style>{`
        .rzp-player-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 90; background: var(--glass-bg-strong); backdrop-filter: blur(30px) saturate(1.7); -webkit-backdrop-filter: blur(30px) saturate(1.7); border-top: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); display: flex; align-items: center; gap: 14px; padding: 10px 20px; }
        .rzp-player-info { flex: 1; min-width: 0; }
        .rzp-player-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rzp-player-sub { font-size: 10.5px; color: var(--text-3); }
        .rzp-player-controls { display: flex; align-items: center; gap: 8px; }
        .rzp-player-controls button { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 100px; width: 32px; height: 32px; color: var(--text-1); cursor: pointer; font-size: 13px; }
        .rzp-player-controls button.play { width: 38px; height: 38px; background: var(--accent-gradient); color: var(--accent-ink); border: none; font-size: 15px; }
        .rzp-player-close { background: transparent; border: none; color: var(--text-3); cursor: pointer; font-size: 16px; }
      `}</style>
      <audio
        ref={audioRef}
        src={track.url}
        autoPlay
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="rzp-player-info">
        <div className="rzp-player-name">{track.name}</div>
        {track.subtitle && <div className="rzp-player-sub">{track.subtitle}</div>}
      </div>
      <div className="rzp-player-controls">
        <button onClick={prev} disabled={tracks.length < 2} title="Anterior">⏮</button>
        <button className="play" onClick={() => setPlaying((p) => !p)} title={playing ? "Pausar" : "Reproducir"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button onClick={next} disabled={tracks.length < 2} title="Siguiente">⏭</button>
      </div>
      <button className="rzp-player-close" onClick={onClose} title="Cerrar">✕</button>
    </div>
  );
}
