"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import porCompania from "@/data/por_compania.json";
import { assignSello, SELLOS } from "@/lib/sellos";
import { GENEROS } from "@/lib/genres";
import { TIPOS_OBRA } from "@/lib/tiposObra";
import { isValidYoutubeUrl } from "@/lib/youtubeLinkValidation";

const distribuidoras = [
  ...(porCompania as { companies: { company: string }[] }).companies
    .map((c) => c.company)
    .filter((c) => c !== "Sin datos"),
  "Sin definir",
];

const ESTADOS = ["Contactado", "Firmado", "Necesito ayuda"] as const;
const PORTADA_SIZE = 3000;
const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const TIPOS = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Álbum" },
] as const;
type Tipo = (typeof TIPOS)[number]["value"] | "";

type ArtistMatch = {
  id: string;
  name: string;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  chartmetricId: number | null;
};

// Preference order when auto-filling "la red social más fuerte" from what's
// on file — Instagram first since it's the most commonly used for artist
// promo in this catalog, falling back down the list.
function bestSocialLink(a: ArtistMatch): string | null {
  return a.instagram || a.tiktok || a.youtube || a.spotify || null;
}

type Props = {
  role: "admin" | "project_manager";
  assignedArtists: string[] | null; // null = admin, sees all
  onClose: () => void;
  onCreated: () => void;
};

type TrackDraft = {
  key: string;
  fonograma: string;
  artistaPrincipal: string;
  autoresCompositores: string;
  colaboradores: string;
  colaboradoresRoles: Record<string, "main" | "featuring">;
  productor: string;
  genero: string;
  otroGenero: string;
  tipoObra: string;
  comentario: string;
  audioFile: File | null;
  audioLinkUrl: string;
  portadaFile: File | null;
  collapsed: boolean;
};

let trackKeySeq = 0;
function newTrackKey() {
  trackKeySeq += 1;
  return `t${trackKeySeq}`;
}

function emptyTrack(artistaPrincipal: string): TrackDraft {
  return {
    key: newTrackKey(),
    fonograma: "",
    artistaPrincipal,
    autoresCompositores: "",
    colaboradores: "",
    colaboradoresRoles: {},
    productor: "",
    genero: "",
    otroGenero: "",
    tipoObra: "",
    comentario: "",
    audioFile: null,
    audioLinkUrl: "",
    portadaFile: null,
    collapsed: false,
  };
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function cancionPlural(n: number): string {
  return n === 1 ? "canción" : "canciones";
}

export default function NuevoLanzamientoForm({ role, assignedArtists, onClose, onCreated }: Props) {
  // null = unrestricted (admin, or a role this form doesn't gate) — the
  // free-text input stays exactly as before. A non-null array means the
  // artist field becomes a picker constrained to it (empty array = no
  // artists assigned yet, shown as an explicit blocked state rather than a
  // silent submit-time 403).
  const restrictedArtists = role === "admin" ? null : assignedArtists;
  const [tipo, setTipo] = useState<Tipo>("");

  const [artist, setArtist] = useState("");
  const [sello, setSello] = useState("");
  const [selloTouched, setSelloTouched] = useState(false);
  const [streamingProjects, setStreamingProjects] = useState<string[]>([]);
  const [streamingProject, setStreamingProject] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Contactado");
  const [distribuidora, setDistribuidora] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("20:00");
  // Nivel lanzamiento, no por track — para un EP/álbum es un solo video y
  // una sola carpeta para todo el lanzamiento, no uno por canción.
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [driveAssetsUrl, setDriveAssetsUrl] = useState("");
  const [youtubeUrlError, setYoutubeUrlError] = useState<string | null>(null);

  // Single-only
  const [fonograma, setFonograma] = useState("");
  const [autores, setAutores] = useState("");
  const [featuring, setFeaturing] = useState("");
  const [featuringRoles, setFeaturingRoles] = useState<Record<string, "main" | "featuring">>({});
  const [genero, setGenero] = useState("");
  const [otroGenero, setOtroGenero] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioLinkUrl, setAudioLinkUrl] = useState("");
  const [portadaFile, setPortadaFile] = useState<File | null>(null);

  // EP/álbum-only
  const [groupNombre, setGroupNombre] = useState("");
  const [comentariosGrupo, setComentariosGrupo] = useState("");
  const [tracks, setTracks] = useState<TrackDraft[]>([]);

  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Field-level red-border highlighting only kicks in after a real submit
  // attempt — a blank form shouldn't look like a wall of errors before the
  // user has even tried to send it.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Plan de Marketing con IA
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiSocialLink, setAiSocialLink] = useState("");
  const [aiGenero, setAiGenero] = useState("");
  const [aiOtroGenero, setAiOtroGenero] = useState("");
  const [aiArtistQuery, setAiArtistQuery] = useState("");
  const [aiArtistResults, setAiArtistResults] = useState<ArtistMatch[]>([]);
  const [aiArtistOpen, setAiArtistOpen] = useState(false);
  const [aiSelectedArtist, setAiSelectedArtist] = useState<ArtistMatch | null>(null);
  const [aiChartmetricId, setAiChartmetricId] = useState<number | null>(null);
  const [aiManualLink, setAiManualLink] = useState(false);
  const aiSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiTienePresupuesto, setAiTienePresupuesto] = useState<"no" | "si" | "">("");
  const [aiPresupuestoMonto, setAiPresupuestoMonto] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isGrouped = tipo === "ep" || tipo === "album";

  useEffect(() => {
    if (isGrouped && tracks.length === 0) {
      setTracks([emptyTrack(artist)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrouped]);

  useEffect(() => {
    fetch("/api/streaming-projects")
      .then((r) => r.json())
      .then((d) => !d.error && setStreamingProjects(d.projects.map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, []);

  function onSelloChange(v: string) {
    setSello(v);
    setSelloTouched(true);
    if (v !== "Streamings") setStreamingProject("");
  }

  function onArtistChange(v: string) {
    setArtist(v);
    if (!selloTouched) {
      const suggested = assignSello(v);
      if (suggested) setSello(suggested);
    }
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setAudioFile(null);
      return;
    }
    const isWav = f.type === "audio/wav" || f.type === "audio/x-wav" || /\.wav$/i.test(f.name);
    if (!isWav) {
      setFileError("El audio tiene que ser un archivo .wav.");
      e.target.value = "";
      setAudioFile(null);
      return;
    }
    setAudioFile(f);
    setAudioLinkUrl("");
  }

  async function handlePortadaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setPortadaFile(null);
      return;
    }
    try {
      const { width, height } = await imageDimensions(f);
      if (width !== PORTADA_SIZE || height !== PORTADA_SIZE) {
        setFileError(`La portada tiene que ser exactamente ${PORTADA_SIZE}x${PORTADA_SIZE}px (subiste ${width}x${height}px).`);
        e.target.value = "";
        setPortadaFile(null);
        return;
      }
      setPortadaFile(f);
    } catch {
      setFileError("No se pudo leer la imagen. Probá con otro archivo.");
      e.target.value = "";
      setPortadaFile(null);
    }
  }

  function updateTrack(key: string, patch: Partial<TrackDraft>) {
    setTracks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function addTrack() {
    setTracks((prev) => [...prev, emptyTrack(artist)]);
  }

  function duplicateTrack(key: string) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], key: newTrackKey(), fonograma: prev[idx].fonograma ? `${prev[idx].fonograma} (copia)` : "" };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function removeTrack(key: string) {
    setTracks((prev) => prev.filter((t) => t.key !== key));
  }

  function moveTrack(key: string, dir: -1 | 1) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  async function handleTrackAudioChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      updateTrack(key, { audioFile: null });
      return;
    }
    const isWav = f.type === "audio/wav" || f.type === "audio/x-wav" || /\.wav$/i.test(f.name);
    if (!isWav) {
      setFileError("El audio tiene que ser un archivo .wav.");
      e.target.value = "";
      updateTrack(key, { audioFile: null });
      return;
    }
    updateTrack(key, { audioFile: f, audioLinkUrl: "" });
  }

  async function handleTrackPortadaChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      updateTrack(key, { portadaFile: null });
      return;
    }
    try {
      const { width, height } = await imageDimensions(f);
      if (width !== PORTADA_SIZE || height !== PORTADA_SIZE) {
        setFileError(`La portada tiene que ser exactamente ${PORTADA_SIZE}x${PORTADA_SIZE}px (subiste ${width}x${height}px).`);
        e.target.value = "";
        updateTrack(key, { portadaFile: null });
        return;
      }
      updateTrack(key, { portadaFile: f });
    } catch {
      setFileError("No se pudo leer la imagen. Probá con otro archivo.");
      e.target.value = "";
      updateTrack(key, { portadaFile: null });
    }
  }

  // Every field on a track is required except colaboradores (featuring),
  // productor, and comentario — same "everything but Featuring" rule as the
  // rest of the form.
  const incompleteTracks = useMemo(
    () => tracks.filter((t) => !t.fonograma.trim() || !t.artistaPrincipal.trim() || !t.autoresCompositores.trim() || !t.tipoObra || (!t.audioFile && !t.audioLinkUrl.trim()) || !t.portadaFile),
    [tracks]
  );

  // All required top-level fields, live — drives both the submit-button
  // readiness state and the "faltan completar" message. Featuring stays out
  // of this list on purpose: it's the one field that's allowed to be empty.
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!tipo) {
      missing.push("Tipo de lanzamiento");
      return missing;
    }
    if (!artist.trim()) missing.push("Artista");
    if (!sello) missing.push("Sello / unidad de negocio");
    if (sello === "Streamings" && !streamingProject) missing.push("Proyecto de streaming");
    if (tipo === "single") {
      if (!fonograma.trim()) missing.push("Nombre del fonograma");
      if (!autores.trim()) missing.push("Autores y compositores");
      if (!tipoObra) missing.push("Tipo de obra");
      if (!audioFile && !audioLinkUrl.trim()) missing.push("Audio (.wav)");
      if (!portadaFile) missing.push("Portada");
    } else {
      if (!groupNombre.trim()) missing.push(`Nombre del ${tipo === "ep" ? "EP" : "álbum"}`);
    }
    if (!distribuidora) missing.push("Distribuidora");
    if (!fecha) missing.push("Fecha de lanzamiento");
    if (!hora) missing.push("Hora de lanzamiento");
    return missing;
  }, [tipo, artist, sello, streamingProject, fonograma, autores, tipoObra, audioFile, audioLinkUrl, portadaFile, groupNombre, distribuidora, fecha, hora]);

  const formIncomplete =
    missingFields.length > 0 || (isGrouped && (tracks.length === 0 || incompleteTracks.length > 0));

  function missingStyle(isMissing: boolean, base: React.CSSProperties = inputStyle): React.CSSProperties {
    if (!isMissing || !submitAttempted) return base;
    return { ...base, border: "1px solid var(--crit-ink)", background: "rgba(220,80,80,0.08)" };
  }
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tracks) {
      const n = norm(t.fonograma);
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    return [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);
  }, [tracks]);

  async function uploadTrackFiles(t: TrackDraft, idx: number, total: number) {
    let audioUrl: string | null = null;
    let portadaUrl: string | null = null;
    if (t.audioFile) {
      const blob = await upload(t.audioFile.name, t.audioFile, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "audio",
        multipart: true,
        onUploadProgress: (p) => setUploadStep(`Subiendo audio ${idx + 1}/${total}... ${Math.round(p.percentage)}%`),
      });
      audioUrl = blob.url;
    } else if (t.audioLinkUrl.trim()) {
      audioUrl = t.audioLinkUrl.trim();
    }
    if (t.portadaFile) {
      setUploadStep(`Subiendo portada ${idx + 1}/${total}...`);
      const blob = await upload(t.portadaFile.name, t.portadaFile, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "portada",
        onUploadProgress: (p) => setUploadStep(`Subiendo portada ${idx + 1}/${total}... ${Math.round(p.percentage)}%`),
      });
      portadaUrl = blob.url;
    }
    return { audioUrl, portadaUrl };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitAttempted(true);

    if (missingFields.length > 0) {
      setError(`Faltan completar: ${missingFields.join(", ")}.`);
      return;
    }
    if (youtubeUrl.trim() && !isValidYoutubeUrl(youtubeUrl)) {
      setYoutubeUrlError("El link no tiene un formato válido de YouTube.");
      setError("El link de YouTube no tiene un formato válido.");
      return;
    }

    if (tipo === "single") {
      setSaving(true);
      try {
        let audioUrl: string | null = null;
        let portadaUrl: string | null = null;
        if (audioFile) {
          setUploadStep("Subiendo audio... 0%");
          const blob = await upload(audioFile.name, audioFile, {
            access: "public",
            handleUploadUrl: "/api/pm/upload",
            clientPayload: "audio",
            multipart: true,
            onUploadProgress: (p) => setUploadStep(`Subiendo audio... ${Math.round(p.percentage)}%`),
          });
          audioUrl = blob.url;
        } else if (audioLinkUrl.trim()) {
          audioUrl = audioLinkUrl.trim();
        }
        if (portadaFile) {
          setUploadStep("Subiendo portada... 0%");
          const blob = await upload(portadaFile.name, portadaFile, {
            access: "public",
            handleUploadUrl: "/api/pm/upload",
            clientPayload: "portada",
            onUploadProgress: (p) => setUploadStep(`Subiendo portada... ${Math.round(p.percentage)}%`),
          });
          portadaUrl = blob.url;
        }
        setUploadStep(null);

        const res = await fetch("/api/pm/releases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "single",
            artist,
            sello,
            streamingProject: sello === "Streamings" ? streamingProject : null,
            fonograma,
            estado,
            distribuidora: distribuidora || null,
            fecha: fecha || null,
            hora: hora || null,
            autoresCompositores: autores || null,
            colaboradores: featuring || null,
            colaboradoresMain: featuring
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n && featuringRoles[n] === "main")
              .join(", ") || null,
            genero: (genero === "Otro" ? otroGenero.trim() : genero) || null,
            tipoObra,
            audioUrl,
            portadaUrl,
            youtubeUrl: youtubeUrl.trim() || null,
            driveAssetsUrl: driveAssetsUrl.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
        setSuccess(true);
        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setSaving(false);
        setUploadStep(null);
      }
      return;
    }

    // EP / álbum
    if (tracks.length === 0) {
      setError("Agregá al menos una canción.");
      return;
    }
    if (incompleteTracks.length > 0) {
      setError(
        `Faltan datos en ${incompleteTracks.length} ${cancionPlural(incompleteTracks.length)} (nombre, artista principal, autores y compositores, audio y portada son obligatorios).`
      );
      return;
    }

    setSaving(true);
    try {
      const uploaded: { audioUrl: string | null; portadaUrl: string | null }[] = [];
      for (let i = 0; i < tracks.length; i++) {
        uploaded.push(await uploadTrackFiles(tracks[i], i, tracks.length));
      }
      setUploadStep(null);

      const res = await fetch("/api/pm/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          artist,
          sello,
          streamingProject: sello === "Streamings" ? streamingProject : null,
          nombre: groupNombre,
          estado,
          distribuidora: distribuidora || null,
          fecha: fecha || null,
          hora: hora || null,
          comentarios: comentariosGrupo || null,
          youtubeUrl: youtubeUrl.trim() || null,
          driveAssetsUrl: driveAssetsUrl.trim() || null,
          tracks: tracks.map((t, i) => ({
            trackNumber: i + 1,
            fonograma: t.fonograma,
            artist: t.artistaPrincipal,
            autoresCompositores: t.autoresCompositores || null,
            colaboradores: t.colaboradores || null,
            colaboradoresMain: t.colaboradores
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n && t.colaboradoresRoles[n] === "main")
              .join(", ") || null,
            productor: t.productor || null,
            genero: (t.genero === "Otro" ? t.otroGenero.trim() : t.genero) || null,
            tipoObra: t.tipoObra,
            comentario: t.comentario || null,
            audioUrl: uploaded[i].audioUrl,
            portadaUrl: uploaded[i].portadaUrl,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setSuccess(true);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
      setUploadStep(null);
    }
  }

  const modalWidth = isGrouped ? 720 : 480;

  // As soon as the AI question flow opens, try to auto-resolve the artist
  // from the socials DB using the name already entered for the release —
  // in the best case the user never has to type or search anything here.
  useEffect(() => {
    if (!showAiForm || aiSelectedArtist || aiManualLink || !artist.trim()) return;
    fetch(`/api/artists/search?q=${encodeURIComponent(artist.trim())}`)
      .then((r) => r.json())
      .then((d: { results?: ArtistMatch[] }) => {
        const results = d.results ?? [];
        const exact = results.find(
          (r) => r.name.trim().toLowerCase() === artist.trim().toLowerCase() && bestSocialLink(r)
        );
        if (exact) {
          setAiSelectedArtist(exact);
          setAiArtistQuery(exact.name);
          setAiSocialLink(bestSocialLink(exact) || "");
          setAiChartmetricId(exact.chartmetricId);
        } else {
          setAiArtistQuery(artist.trim());
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAiForm]);

  function runArtistSearch(query: string) {
    setAiArtistQuery(query);
    setAiSelectedArtist(null);
    setAiChartmetricId(null);
    setAiSocialLink("");
    if (aiSearchDebounce.current) clearTimeout(aiSearchDebounce.current);
    if (query.trim().length < 2) {
      setAiArtistResults([]);
      setAiArtistOpen(false);
      return;
    }
    aiSearchDebounce.current = setTimeout(() => {
      fetch(`/api/artists/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d: { results?: ArtistMatch[] }) => {
          setAiArtistResults(d.results ?? []);
          setAiArtistOpen(true);
        })
        .catch(() => {});
    }, 250);
  }

  function selectArtist(a: ArtistMatch) {
    setAiSelectedArtist(a);
    setAiArtistQuery(a.name);
    setAiSocialLink(bestSocialLink(a) || "");
    setAiChartmetricId(a.chartmetricId);
    setAiArtistOpen(false);
  }

  async function handleGenerateAiPlan() {
    setAiError(null);
    if (!aiSocialLink.trim()) {
      setAiError("Elegí el artista en el buscador o pegá el link de su red social manualmente.");
      return;
    }
    if (!/^https?:\/\//i.test(aiSocialLink.trim())) {
      setAiError("El link tiene que empezar con http:// o https://");
      return;
    }
    if (!aiGenero) {
      setAiError("Elegí el género principal.");
      return;
    }
    if (aiGenero === "Otro" && !aiOtroGenero.trim()) {
      setAiError("Escribí el género del lanzamiento.");
      return;
    }
    if (!aiTienePresupuesto) {
      setAiError("Indicá si hay presupuesto de marketing.");
      return;
    }
    if (aiTienePresupuesto === "si" && !aiPresupuestoMonto.trim()) {
      setAiError("Ingresá el presupuesto aproximado en pesos argentinos.");
      return;
    }

    const featuringCombined = isGrouped
      ? [...new Set(tracks.flatMap((t) => (t.colaboradores ? t.colaboradores.split(",").map((c) => c.trim()) : [])))].join(", ")
      : featuring;

    setAiGenerating(true);
    try {
      const res = await fetch("/api/marketing-plan/personalizado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist,
          featuring: featuringCombined || null,
          sello: sello || null,
          tipo,
          fonograma: isGrouped ? groupNombre : fonograma,
          fecha: fecha || null,
          genero: aiGenero === "Otro" ? aiOtroGenero.trim() : aiGenero,
          socialLink: aiSocialLink.trim(),
          chartmetricId: aiChartmetricId,
          presupuesto:
            aiTienePresupuesto === "si"
              ? { tiene: true, montoArs: Number(aiPresupuestoMonto.replace(/\D/g, "")) }
              : { tiene: false },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el plan.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Plan-Marketing-${artist}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setAiGenerating(false);
    }
  }

  // Whether there's anything typed/attached that a careless close (backdrop
  // click, Cancelar, or — the actual bug report — a two-finger trackpad
  // "back" gesture navigating the whole page away) would silently destroy.
  // Once success is true the release is already saved, so nothing more to
  // protect.
  const isDirty = useMemo(() => {
    if (success || !tipo) return false;
    const topLevelDirty =
      fonograma.trim() !== "" ||
      artist.trim() !== "" ||
      featuring.trim() !== "" ||
      autores.trim() !== "" ||
      !!audioFile ||
      audioLinkUrl.trim() !== "" ||
      !!portadaFile ||
      groupNombre.trim() !== "" ||
      comentariosGrupo.trim() !== "" ||
      youtubeUrl.trim() !== "" ||
      driveAssetsUrl.trim() !== "";
    if (topLevelDirty) return true;
    return tracks.some(
      (t) =>
        t.fonograma.trim() !== "" ||
        t.artistaPrincipal.trim() !== "" ||
        t.autoresCompositores.trim() !== "" ||
        t.colaboradores.trim() !== "" ||
        t.productor.trim() !== "" ||
        !!t.audioFile ||
        t.audioLinkUrl.trim() !== "" ||
        !!t.portadaFile ||
        t.comentario.trim() !== ""
    );
  }, [
    success, tipo, fonograma, artist, featuring, autores, audioFile, audioLinkUrl,
    portadaFile, groupNombre, comentariosGrupo, youtubeUrl, driveAssetsUrl, tracks,
  ]);

  // Read inside the popstate handler instead of as an effect dependency —
  // the guard below is armed once per mount, not re-armed on every keystroke.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Closes only after confirming with the user when there's unsaved data.
  // Returns whether it actually closed, so the back-gesture guard below
  // knows whether to let the "back" stand or re-trap it.
  function requestClose(): boolean {
    if (!isDirtyRef.current) {
      onClose();
      return true;
    }
    const leave = window.confirm(
      "Tenés datos sin guardar en este lanzamiento. Si salís ahora se pierden. ¿Salir de todos modos?"
    );
    if (leave) onClose();
    return leave;
  }

  // requestClose is a plain function (new identity every render) — routed
  // through a ref so the mount-once effect below always calls the latest
  // version without needing to re-run (and re-push a history entry) on
  // every keystroke.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // A two-finger trackpad "back" swipe (or Alt+←, or the mouse back button)
  // fires a real browser popstate. Since this modal has no route of its own,
  // that used to navigate the whole /pm/fonograma page away and unmount the
  // form — wiping every track that hadn't been saved yet. Pushing one dummy
  // history entry on mount means the first back gesture just pops that
  // entry (same URL, nothing unmounts) so we can intercept it here instead
  // of letting the browser actually leave the page.
  useEffect(() => {
    window.history.pushState({ nuevoLanzamientoGuard: true }, "", window.location.href);
    function handlePopState() {
      const closed = requestCloseRef.current();
      if (!closed) {
        // User chose to stay — re-arm the trap for the next back attempt.
        window.history.pushState({ nuevoLanzamientoGuard: true }, "", window.location.href);
      }
    }
    window.addEventListener("popstate", handlePopState);
    // Deliberately NOT calling history.back() in cleanup to consume the
    // dummy entry — that itself fires a real popstate that Next's router
    // reacts to, which caused a remount loop under Strict Mode's mount→
    // cleanup→mount dev cycle. Leaving one harmless same-URL entry behind
    // is a fine trade: worst case a later real "back" needs one extra press.
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (success) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(40px) saturate(1.7)",
            WebkitBackdropFilter: "blur(40px) saturate(1.7)",
            color: "var(--text-1)",
            borderRadius: 20,
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-glass-lg)",
            width: "100%",
            maxWidth: 420,
            padding: "3rem 2rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "var(--good-bg)",
              color: "var(--good-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 700,
              animation: "pm-check-pop .35s var(--ease-out)",
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>¡Lanzamiento creado con éxito!</div>

          {!showAiForm ? (
            <>
              <div
                style={{
                  width: "100%",
                  marginTop: 8,
                  paddingTop: 20,
                  borderTop: "1px solid var(--line-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-2)" }}>
                  Plan de Marketing disponible
                </div>

                <a
                  href="/plan-marketing-base.pdf"
                  download
                  style={{
                    background: "var(--accent-glass-bg)",
                    border: "1px solid var(--accent-glass-border)",
                    borderRadius: 10,
                    padding: "11px 16px",
                    color: "var(--text-1)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    textDecoration: "none",
                    backdropFilter: "blur(20px) saturate(1.7)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.7)",
                    cursor: "pointer",
                  }}
                >
                  ↓ Descargar Plan Base
                </a>

                <button
                  type="button"
                  onClick={() => setShowAiForm(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: "11px 16px",
                    color: "var(--text-1)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Generar Plan Personalizado con IA
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: 6,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-3)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Cerrar
              </button>
            </>
          ) : (
            <div
              style={{
                width: "100%",
                marginTop: 8,
                paddingTop: 20,
                borderTop: "1px solid var(--line-soft)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-2)", textAlign: "center" }}>
                Plan Personalizado con IA
              </div>

              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 12, color: "var(--text-2)" }}>
                  Red social más fuerte del artista
                </label>

                {!aiManualLink ? (
                  <>
                    <input
                      value={aiArtistQuery}
                      onChange={(e) => runArtistSearch(e.target.value)}
                      onFocus={() => aiArtistResults.length > 0 && setAiArtistOpen(true)}
                      placeholder="Buscar artista..."
                      disabled={aiGenerating}
                      style={inputStyle}
                      autoComplete="off"
                    />
                    {aiArtistOpen && aiArtistResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: 4,
                          background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
                          borderRadius: 10, boxShadow: "var(--shadow-glass)", overflow: "hidden",
                          backdropFilter: "blur(30px) saturate(1.7)", WebkitBackdropFilter: "blur(30px) saturate(1.7)",
                        }}
                      >
                        {aiArtistResults.map((r) => {
                          const handle = bestSocialLink(r);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => selectArtist(r)}
                              style={{
                                display: "block", width: "100%", textAlign: "left", padding: "9px 12px",
                                background: "transparent", border: "none", borderBottom: "1px solid var(--line-soft)",
                                color: "var(--text-1)", fontSize: 13, cursor: "pointer",
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: handle ? "var(--text-3)" : "var(--crit-ink)" }}>
                                {handle ? handle.replace(/^https?:\/\//, "") : "Sin redes cargadas todavía"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {aiSelectedArtist && (
                      <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--good-ink)" }}>
                        ✓ Usando {bestSocialLink(aiSelectedArtist)?.replace(/^https?:\/\//, "")}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAiManualLink(true);
                        setAiArtistOpen(false);
                        setAiSelectedArtist(null);
                        setAiChartmetricId(null);
                      }}
                      style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11, textDecoration: "underline", cursor: "pointer", marginTop: 6, padding: 0 }}
                    >
                      ¿No aparece? Pegar el link manualmente
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      value={aiSocialLink}
                      onChange={(e) => setAiSocialLink(e.target.value)}
                      placeholder="https://instagram.com/... o tiktok, youtube, etc."
                      disabled={aiGenerating}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => { setAiManualLink(false); setAiSocialLink(""); }}
                      style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11, textDecoration: "underline", cursor: "pointer", marginTop: 6, padding: 0 }}
                    >
                      Volver a buscar
                    </button>
                  </>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)" }}>Género principal</label>
                <select
                  value={aiGenero}
                  onChange={(e) => setAiGenero(e.target.value)}
                  disabled={aiGenerating}
                  style={inputStyle}
                >
                  <option value="">Elegir...</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {aiGenero === "Otro" && (
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-2)" }}>¿Qué género es?</label>
                  <input
                    value={aiOtroGenero}
                    onChange={(e) => setAiOtroGenero(e.target.value)}
                    placeholder="Ej: Bachata, Corridos, R&B..."
                    disabled={aiGenerating}
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)" }}>¿Cuenta con presupuesto de marketing?</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {(["no", "si"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => setAiTienePresupuesto(v)}
                      style={{
                        flex: 1,
                        padding: "9px 10px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        cursor: "pointer",
                        border: aiTienePresupuesto === v ? "1px solid var(--accent-glass-border)" : "1px solid var(--line-soft)",
                        background: aiTienePresupuesto === v ? "var(--accent-glass-bg)" : "transparent",
                        color: "var(--text-1)",
                      }}
                    >
                      {v === "no" ? "No, 100% orgánico" : "Sí"}
                    </button>
                  ))}
                </div>
              </div>

              {aiTienePresupuesto === "si" && (
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-2)" }}>Presupuesto aproximado (ARS)</label>
                  <input
                    value={aiPresupuestoMonto}
                    onChange={(e) => setAiPresupuestoMonto(e.target.value)}
                    placeholder="Ej: 200000"
                    disabled={aiGenerating}
                    style={inputStyle}
                  />
                </div>
              )}

              {aiError && (
                <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
                  {aiError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowAiForm(false)}
                  disabled={aiGenerating}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: "11px 16px",
                    color: "var(--text-2)",
                    fontSize: 13,
                    cursor: aiGenerating ? "default" : "pointer",
                  }}
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiPlan}
                  disabled={aiGenerating}
                  style={{
                    flex: 2,
                    background: "var(--accent-glass-bg)",
                    border: "1px solid var(--accent-glass-border)",
                    borderRadius: 10,
                    padding: "11px 16px",
                    color: "var(--text-1)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: aiGenerating ? "default" : "pointer",
                    opacity: aiGenerating ? 0.6 : 1,
                  }}
                >
                  {aiGenerating ? "Generando..." : "Generar y descargar"}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={aiGenerating}
                style={{
                  marginTop: 2,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-3)",
                  fontSize: 12.5,
                  cursor: aiGenerating ? "default" : "pointer",
                  textDecoration: "underline",
                  alignSelf: "center",
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          <style>{`
            @keyframes pm-check-pop {
              0% { transform: scale(0); opacity: 0; }
              70% { transform: scale(1.15); opacity: 1; }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        overflowY: "auto",
      }}
      onClick={requestClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(40px) saturate(1.7)",
          WebkitBackdropFilter: "blur(40px) saturate(1.7)",
          color: "var(--text-1)",
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-glass-lg)",
          width: "100%",
          maxWidth: modalWidth,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>+ Nuevo lanzamiento</div>

        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Tipo de lanzamiento</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: tipo === t.value ? "1px solid var(--accent-color)" : "1px solid var(--line-soft)",
                  background: tipo === t.value ? "rgba(63,198,209,0.15)" : "var(--bg-2)",
                  color: tipo === t.value ? "var(--accent-color)" : "var(--text-2)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tipo && (
          <>
            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Artista</label>
              {restrictedArtists === null ? (
                <input
                  value={artist}
                  onChange={(e) => onArtistChange(e.target.value)}
                  placeholder="Nombre del artista"
                  style={missingStyle(!artist.trim())}
                />
              ) : restrictedArtists.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--crit-ink)", margin: "4px 0 0" }}>
                  No tenés artistas asignados — pedile a Management que te asigne uno.
                </p>
              ) : (
                <select value={artist} onChange={(e) => onArtistChange(e.target.value)} style={missingStyle(!artist.trim())}>
                  <option value="">Elegir...</option>
                  {restrictedArtists.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Sello / unidad de negocio</label>
              <select
                value={sello}
                onChange={(e) => onSelloChange(e.target.value)}
                style={missingStyle(!sello)}
              >
                <option value="">Elegir...</option>
                {SELLOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {sello === "Streamings" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Seleccionar streaming</label>
                <select
                  value={streamingProject}
                  onChange={(e) => setStreamingProject(e.target.value)}
                  style={missingStyle(!streamingProject)}
                >
                  <option value="">Elegir...</option>
                  {streamingProjects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {tipo === "single" ? (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Nombre del fonograma</label>
                <input
                  value={fonograma}
                  onChange={(e) => setFonograma(e.target.value)}
                  placeholder="Nombre del single"
                  style={missingStyle(!fonograma.trim())}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                  Nombre del {tipo === "ep" ? "EP" : "álbum"}
                </label>
                <input
                  value={groupNombre}
                  onChange={(e) => setGroupNombre(e.target.value)}
                  placeholder={`Nombre del ${tipo === "ep" ? "EP" : "álbum"}`}
                  style={missingStyle(!groupNombre.trim())}
                />
              </div>
            )}

            {tipo === "single" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Autores y compositores</label>
                <input
                  value={autores}
                  onChange={(e) => setAutores(e.target.value)}
                  placeholder="Nombre y apellido de cada uno, separados por coma"
                  style={missingStyle(!autores.trim())}
                />
              </div>
            )}

            {tipo === "single" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                  Featuring / artistas invitados <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  value={featuring}
                  onChange={(e) => setFeaturing(e.target.value)}
                  placeholder="Nombres separados por coma (dejar vacío si no hay)"
                  style={inputStyle}
                />
                {featuring.trim() && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {featuring.split(",").map((raw) => raw.trim()).filter(Boolean).map((name) => {
                      const role = featuringRoles[name] ?? "featuring";
                      return (
                        <div
                          key={name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            background: "var(--bg-2)",
                            border: "1px solid var(--line-soft)",
                            borderRadius: 8,
                            padding: "6px 8px 6px 12px",
                            fontSize: 12.5,
                          }}
                        >
                          <span>{name}</span>
                          <select
                            value={role}
                            onChange={(e) =>
                              setFeaturingRoles((prev) => ({
                                ...prev,
                                [name]: e.target.value as "main" | "featuring",
                              }))
                            }
                            style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}
                          >
                            <option value="featuring">Featuring</option>
                            <option value="main">Main</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tipo === "single" && (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Tipo de obra</label>
                  <select value={tipoObra} onChange={(e) => setTipoObra(e.target.value)} style={missingStyle(!tipoObra)}>
                    <option value="">Elegir...</option>
                    {TIPOS_OBRA.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                    Género <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <select value={genero} onChange={(e) => setGenero(e.target.value)} style={inputStyle}>
                    <option value="">Elegir...</option>
                    {GENEROS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {tipo === "single" && genero === "Otro" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>¿Qué género es?</label>
                <input
                  value={otroGenero}
                  onChange={(e) => setOtroGenero(e.target.value)}
                  placeholder="Ej: Bachata, Corridos, R&B..."
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Estado del release</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Distribuidora</label>
              <select value={distribuidora} onChange={(e) => setDistribuidora(e.target.value)} style={missingStyle(!distribuidora)}>
                <option value="">Elegir...</option>
                {distribuidoras.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Fecha de lanzamiento</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={missingStyle(!fecha)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Hora (ART)</label>
                <select value={hora} onChange={(e) => setHora(e.target.value)} style={missingStyle(!hora)}>
                  {HORAS.map((h) => (
                    <option key={h} value={`${h}:00`}>
                      {h}
                      {["19", "20", "21"].includes(h) ? " (sugerido)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                  Link del video de YouTube <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeUrlError(null); }}
                  onBlur={() => setYoutubeUrlError(youtubeUrl.trim() && !isValidYoutubeUrl(youtubeUrl) ? "El link no tiene un formato válido de YouTube." : null)}
                  placeholder="https://youtube.com/watch?v=... o youtu.be/..."
                  style={missingStyle(!!youtubeUrlError, inputStyle)}
                />
                {youtubeUrlError && <p style={{ fontSize: 11.5, color: "var(--crit-ink)", marginTop: 4 }}>{youtubeUrlError}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                  Link de assets (carpeta de Drive) <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  value={driveAssetsUrl}
                  onChange={(e) => setDriveAssetsUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  style={inputStyle}
                />
              </div>
            </div>

            {tipo === "single" ? (
              <>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Audio (.wav)</label>
                  <input type="file" accept=".wav,audio/wav" onChange={handleAudioChange} style={missingStyle(!audioFile && !audioLinkUrl.trim(), fileInputStyle)} />
                  {audioFile && <p style={{ fontSize: 11.5, color: "var(--good)", marginTop: 4 }}>✓ {audioFile.name}</p>}
                  <input
                    value={audioLinkUrl}
                    onChange={(e) => setAudioLinkUrl(e.target.value)}
                    placeholder="...o pegá un link para descargarlo (WeTransfer, Drive, etc.)"
                    disabled={!!audioFile}
                    style={{ ...missingStyle(!audioFile && !audioLinkUrl.trim(), inputStyle), marginTop: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                    Portada ({PORTADA_SIZE}x{PORTADA_SIZE}px, para Spotify)
                  </label>
                  <input type="file" accept="image/png,image/jpeg" onChange={handlePortadaChange} style={missingStyle(!portadaFile, fileInputStyle)} />
                  {portadaFile && <p style={{ fontSize: 11.5, color: "var(--good)", marginTop: 4 }}>✓ {portadaFile.name}</p>}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                    Comentarios u observaciones <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <textarea
                    value={comentariosGrupo}
                    onChange={(e) => setComentariosGrupo(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>
                    Canciones del lanzamiento
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
                    {tracks.length} {cancionPlural(tracks.length)} cargada{tracks.length === 1 ? "" : "s"}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tracks.map((t, i) => (
                      <div
                        key={t.key}
                        style={{
                          border: "1px solid var(--line-soft)",
                          borderRadius: 10,
                          background: "var(--bg-2)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateTrack(t.key, { collapsed: !t.collapsed })}
                        >
                          <span style={{ fontSize: 12, color: "var(--text-3)", width: 20 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                            {t.fonograma || "Sin nombre todavía"}
                            {(!t.fonograma.trim() || !t.artistaPrincipal.trim() || !t.audioFile || !t.portadaFile) && (
                              <span style={{ color: "var(--warn)", fontWeight: 500, fontSize: 11.5 }}> · incompleta</span>
                            )}
                          </span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTrack(t.key, -1); }} disabled={i === 0} style={miniBtnStyle(i === 0)}>↑</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTrack(t.key, 1); }} disabled={i === tracks.length - 1} style={miniBtnStyle(i === tracks.length - 1)}>↓</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); duplicateTrack(t.key); }} style={miniBtnStyle(false)} title="Duplicar">⧉</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeTrack(t.key); }} disabled={tracks.length === 1} style={miniBtnStyle(tracks.length === 1)} title="Eliminar">×</button>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{t.collapsed ? "▸" : "▾"}</span>
                        </div>

                        {!t.collapsed && (
                          <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div>
                              <label style={smallLabel}>Nombre de la canción</label>
                              <input
                                value={t.fonograma}
                                onChange={(e) => updateTrack(t.key, { fonograma: e.target.value })}
                                style={missingStyle(!t.fonograma.trim())}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>Artista principal</label>
                              <input
                                value={t.artistaPrincipal}
                                onChange={(e) => updateTrack(t.key, { artistaPrincipal: e.target.value })}
                                placeholder="Escribí el nombre del artista"
                                list={restrictedArtists && restrictedArtists.length > 0 ? `artistas-track-${t.key}` : undefined}
                                style={missingStyle(!t.artistaPrincipal.trim())}
                              />
                              {restrictedArtists && restrictedArtists.length > 0 && (
                                <datalist id={`artistas-track-${t.key}`}>
                                  {restrictedArtists.map((a) => (
                                    <option key={a} value={a} />
                                  ))}
                                </datalist>
                              )}
                            </div>
                            <div>
                              <label style={smallLabel}>Autores y compositores</label>
                              <input
                                value={t.autoresCompositores}
                                onChange={(e) => updateTrack(t.key, { autoresCompositores: e.target.value })}
                                placeholder="Nombre y apellido de cada uno, separados por coma"
                                style={missingStyle(!t.autoresCompositores.trim())}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>
                                Featuring / artistas invitados <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(opcional)</span>
                              </label>
                              <input
                                value={t.colaboradores}
                                onChange={(e) => updateTrack(t.key, { colaboradores: e.target.value })}
                                placeholder="Nombres separados por coma (dejar vacío si no hay)"
                                style={inputStyle}
                              />
                              {t.colaboradores.trim() && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                                  {t.colaboradores.split(",").map((raw) => raw.trim()).filter(Boolean).map((name) => {
                                    const role = t.colaboradoresRoles[name] ?? "featuring";
                                    return (
                                      <div
                                        key={name}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: 10,
                                          background: "var(--bg-2)",
                                          border: "1px solid var(--line-soft)",
                                          borderRadius: 8,
                                          padding: "6px 8px 6px 12px",
                                          fontSize: 12.5,
                                        }}
                                      >
                                        <span>{name}</span>
                                        <select
                                          value={role}
                                          onChange={(e) =>
                                            updateTrack(t.key, {
                                              colaboradoresRoles: {
                                                ...t.colaboradoresRoles,
                                                [name]: e.target.value as "main" | "featuring",
                                              },
                                            })
                                          }
                                          style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}
                                        >
                                          <option value="featuring">Featuring</option>
                                          <option value="main">Main</option>
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <label style={smallLabel}>Productor (opcional, si corresponde)</label>
                              <input
                                value={t.productor}
                                onChange={(e) => updateTrack(t.key, { productor: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <label style={smallLabel}>Tipo de obra</label>
                                <select
                                  value={t.tipoObra}
                                  onChange={(e) => updateTrack(t.key, { tipoObra: e.target.value })}
                                  style={missingStyle(!t.tipoObra, inputStyle)}
                                >
                                  <option value="">Elegir...</option>
                                  {TIPOS_OBRA.map((to) => (
                                    <option key={to} value={to}>{to}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={smallLabel}>Género (opcional)</label>
                                <select
                                  value={t.genero}
                                  onChange={(e) => updateTrack(t.key, { genero: e.target.value })}
                                  style={inputStyle}
                                >
                                  <option value="">Elegir...</option>
                                  {GENEROS.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {t.genero === "Otro" && (
                              <div>
                                <label style={smallLabel}>¿Qué género es?</label>
                                <input
                                  value={t.otroGenero}
                                  onChange={(e) => updateTrack(t.key, { otroGenero: e.target.value })}
                                  placeholder="Ej: Bachata, Corridos, R&B..."
                                  style={inputStyle}
                                />
                              </div>
                            )}
                            <div>
                              <label style={smallLabel}>Audio (.wav) — estado: {t.audioFile || t.audioLinkUrl.trim() ? "Cargado" : "Pendiente"}</label>
                              <input type="file" accept=".wav,audio/wav" onChange={(e) => handleTrackAudioChange(t.key, e)} style={missingStyle(!t.audioFile && !t.audioLinkUrl.trim(), fileInputStyle)} />
                              <input
                                value={t.audioLinkUrl}
                                onChange={(e) => updateTrack(t.key, { audioLinkUrl: e.target.value })}
                                placeholder="...o pegá un link para descargarlo (WeTransfer, Drive, etc.)"
                                disabled={!!t.audioFile}
                                style={{ ...missingStyle(!t.audioFile && !t.audioLinkUrl.trim()), marginTop: 6 }}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>
                                Portada ({PORTADA_SIZE}x{PORTADA_SIZE}px) — estado: {t.portadaFile ? "Cargada" : "Pendiente"}
                              </label>
                              <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleTrackPortadaChange(t.key, e)} style={missingStyle(!t.portadaFile, fileInputStyle)} />
                            </div>
                            <div>
                              <label style={smallLabel}>Comentario u observación (opcional)</label>
                              <input
                                value={t.comentario}
                                onChange={(e) => updateTrack(t.key, { comentario: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTrack}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 8,
                      border: "1px dashed var(--line-soft)",
                      background: "transparent",
                      color: "var(--text-2)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + Agregar canción
                  </button>
                </div>

                <div
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 12.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div>Total de canciones: <strong>{tracks.length}</strong></div>
                  <div style={{ color: incompleteTracks.length ? "var(--crit-ink)" : "var(--text-3)" }}>
                    Con información incompleta: <strong>{incompleteTracks.length}</strong>
                  </div>
                  {duplicateNames.length > 0 && (
                    <div style={{ color: "var(--warn-ink)" }}>
                      Nombres duplicados: {duplicateNames.join(", ")}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {fileError && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
            {fileError}
          </div>
        )}
        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={requestClose}
            style={{
              background: "transparent",
              border: "1px solid var(--line-soft)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            title={formIncomplete ? "Completá los campos obligatorios para poder enviar" : undefined}
            style={{
              background: "var(--accent-glass-bg)",
              border: "1px solid var(--accent-glass-border)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "var(--text-1)",
              fontWeight: 600,
              backdropFilter: "blur(20px) saturate(1.7)",
              WebkitBackdropFilter: "blur(20px) saturate(1.7)",
              cursor: saving ? "default" : "pointer",
              fontSize: 13,
              opacity: saving || formIncomplete ? 0.55 : 1,
            }}
          >
            {saving
              ? uploadStep ?? "Guardando..."
              : isGrouped
              ? `Confirmar y guardar ${tipo === "ep" ? "EP" : "álbum"} (${tracks.length} ${cancionPlural(tracks.length)})`
              : "Guardar lanzamiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

const smallLabel: React.CSSProperties = { fontSize: 11.5, color: "var(--text-3)" };

function miniBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--line-soft)",
    borderRadius: 6,
    width: 22,
    height: 22,
    fontSize: 12,
    color: disabled ? "var(--line)" : "var(--text-2)",
    cursor: disabled ? "default" : "pointer",
    lineHeight: 1,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 8px",
};
