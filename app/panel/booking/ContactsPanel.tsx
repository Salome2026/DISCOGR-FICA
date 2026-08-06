"use client";

import { useEffect, useMemo, useState } from "react";

type BookingContact = {
  id: string;
  nombre: string;
  apellido: string | null;
  venueNombre: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  observaciones: string | null;
  provincia: string | null;
  pais: string | null;
};

const SIN_PAIS = "Sin país";
const SIN_PROVINCIA = "Sin provincia";

export default function ContactsPanel() {
  const [contacts, setContacts] = useState<BookingContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<BookingContact | "new" | null>(null);
  const [paisFilter, setPaisFilter] = useState<string | null>(null);
  const [provinciaFilter, setProvinciaFilter] = useState<string | null>(null);

  function reload() {
    fetch("/api/booking/contacts")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setContacts(d.contacts);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(reload, []);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.nombre, c.apellido, c.venueNombre, c.telefono, c.instagram, c.email, c.provincia, c.pais]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q))
    );
  }, [contacts, query]);

  // Chip options are derived from the search-filtered set (not the raw list)
  // so they narrow along with a text search, and from the pre-país-filter
  // set for provincia so switching país resets the visible provincia chips.
  const paisOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) {
      const pais = c.pais?.trim() || SIN_PAIS;
      counts.set(pais, (counts.get(pais) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === SIN_PAIS) return 1;
      if (b === SIN_PAIS) return -1;
      return a.localeCompare(b, "es");
    });
  }, [filtered]);

  const provinciaOptions = useMemo(() => {
    if (!paisFilter) return [];
    const counts = new Map<string, number>();
    for (const c of filtered) {
      if ((c.pais?.trim() || SIN_PAIS) !== paisFilter) continue;
      const provincia = c.provincia?.trim() || SIN_PROVINCIA;
      counts.set(provincia, (counts.get(provincia) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === SIN_PROVINCIA) return 1;
      if (b === SIN_PROVINCIA) return -1;
      return a.localeCompare(b, "es");
    });
  }, [filtered, paisFilter]);

  const geoFiltered = useMemo(() => {
    return filtered.filter((c) => {
      if (paisFilter && (c.pais?.trim() || SIN_PAIS) !== paisFilter) return false;
      if (provinciaFilter && (c.provincia?.trim() || SIN_PROVINCIA) !== provinciaFilter) return false;
      return true;
    });
  }, [filtered, paisFilter, provinciaFilter]);

  function selectPais(pais: string | null) {
    setPaisFilter(pais);
    setProvinciaFilter(null);
  }

  // Grouped by país → provincia, per module request — a flat list of 50+
  // venue contacts across several countries was unusable without this split.
  const grouped = useMemo(() => {
    const byPais = new Map<string, Map<string, BookingContact[]>>();
    for (const c of geoFiltered) {
      const pais = c.pais?.trim() || SIN_PAIS;
      const provincia = c.provincia?.trim() || SIN_PROVINCIA;
      if (!byPais.has(pais)) byPais.set(pais, new Map());
      const byProvincia = byPais.get(pais)!;
      if (!byProvincia.has(provincia)) byProvincia.set(provincia, []);
      byProvincia.get(provincia)!.push(c);
    }
    const paisEntries = [...byPais.entries()].sort(([a], [b]) => {
      if (a === SIN_PAIS) return 1;
      if (b === SIN_PAIS) return -1;
      return a.localeCompare(b, "es");
    });
    return paisEntries.map(([pais, byProvincia]) => ({
      pais,
      provincias: [...byProvincia.entries()].sort(([a], [b]) => {
        if (a === SIN_PROVINCIA) return 1;
        if (b === SIN_PROVINCIA) return -1;
        return a.localeCompare(b, "es");
      }),
    }));
  }, [geoFiltered]);

  return (
    <div className="card bkct-card">
      <style>{`
        .bkct-card { display: flex; flex-direction: column; gap: 1rem; }
        .bkct-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .bkct-title { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
        .bkct-toolbar { display: flex; gap: 10px; flex-wrap: wrap; }
        .bkct-search { flex: 1; min-width: 200px; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 13.5px; font-family: inherit; }
        .bkct-new-btn { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .bkct-chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .bkct-chip { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-pill); padding: 6px 13px; font-size: 12.5px; font-weight: 600; color: var(--text-2); cursor: pointer; }
        .bkct-chip:hover { color: var(--text-1); border-color: var(--accent-color-glow); }
        .bkct-chip.active { background: var(--accent-glass-bg); color: var(--text-1); border-color: var(--accent-color-glow); }
        .bkct-chip .n { color: var(--text-3); margin-left: 4px; }
        .bkct-chip.active .n { color: inherit; opacity: .75; }
        .bkct-groups { display: flex; flex-direction: column; gap: 1.8rem; }
        .bkct-pais-group { display: flex; flex-direction: column; gap: 1rem; }
        .bkct-pais-title { font-size: 16px; font-weight: 700; letter-spacing: -.01em; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border); }
        .bkct-pais-title .count { color: var(--text-3); font-weight: 500; font-size: 13px; margin-left: 6px; }
        .bkct-provincia-group { display: flex; flex-direction: column; gap: 10px; }
        .bkct-provincia-title { font-size: 12px; color: var(--text-2); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
        .bkct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
        .bkct-item { display: flex; flex-direction: column; gap: 6px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.1rem; }
        .bkct-name { font-size: 15px; font-weight: 700; }
        .bkct-venue { font-size: 13px; color: var(--text-2); font-weight: 500; }
        .bkct-meta { font-size: 12.5px; color: var(--text-2); display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
        .bkct-edit-btn { align-self: flex-start; background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 12px; color: var(--text-2); cursor: pointer; font-size: 12px; margin-top: 6px; }
        .bkct-edit-btn:hover { border-color: var(--accent-color-glow); color: var(--text-1); }
        .bkct-empty { color: var(--text-3); font-size: 13.5px; padding: 1.5rem 0; text-align: center; }

        .bkct-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto; }
        .bkct-modal { background: var(--glass-bg-strong); backdrop-filter: blur(40px) saturate(1.7); -webkit-backdrop-filter: blur(40px) saturate(1.7); color: var(--text-1); border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); width: 100%; max-width: 460px; padding: 1.6rem; display: flex; flex-direction: column; gap: 14px; }
        .bkct-modal h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .bkct-field { display: flex; flex-direction: column; gap: 6px; }
        .bkct-field label { font-size: 12px; color: var(--text-3); }
        .bkct-field input, .bkct-field textarea { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 11px; color: var(--text-1); font-size: 13.5px; font-family: inherit; }
        .bkct-field-row { display: flex; gap: 10px; }
        .bkct-field-row .bkct-field { flex: 1; }
        .bkct-modal-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; }
        .bkct-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .bkct-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 14px; color: var(--text-2); cursor: pointer; font-size: 13px; }
        .bkct-btn-danger { background: transparent; border: 1px solid var(--crit); border-radius: 8px; padding: 9px 14px; color: var(--crit-ink); cursor: pointer; font-size: 13px; }
      `}</style>

      <div className="bkct-header">
        <div>
          <div className="card-label">Base de contactos</div>
          <div className="bkct-title">Boliches y venues</div>
        </div>
      </div>

      <div className="bkct-toolbar">
        <input
          className="bkct-search"
          type="text"
          placeholder="Buscar por nombre, venue, teléfono, Instagram o email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="bkct-new-btn" onClick={() => setEditing("new")}>+ Nuevo contacto</button>
      </div>

      {paisOptions.length > 1 && (
        <div className="bkct-chip-row">
          <button className={`bkct-chip${!paisFilter ? " active" : ""}`} onClick={() => selectPais(null)}>
            Todos<span className="n">({filtered.length})</span>
          </button>
          {paisOptions.map(([pais, n]) => (
            <button key={pais} className={`bkct-chip${paisFilter === pais ? " active" : ""}`} onClick={() => selectPais(pais)}>
              {pais}<span className="n">({n})</span>
            </button>
          ))}
        </div>
      )}

      {paisFilter && provinciaOptions.length > 1 && (
        <div className="bkct-chip-row">
          <button className={`bkct-chip${!provinciaFilter ? " active" : ""}`} onClick={() => setProvinciaFilter(null)}>
            Todas<span className="n">({provinciaOptions.reduce((n, [, c]) => n + c, 0)})</span>
          </button>
          {provinciaOptions.map(([provincia, n]) => (
            <button key={provincia} className={`bkct-chip${provinciaFilter === provincia ? " active" : ""}`} onClick={() => setProvinciaFilter(provincia)}>
              {provincia}<span className="n">({n})</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="bkct-empty">Error: {error}</p>}
      {contacts === null && !error && <p className="bkct-empty">Cargando contactos...</p>}
      {contacts !== null && contacts.length === 0 && <p className="bkct-empty">No hay contactos todavía.</p>}
      {contacts !== null && contacts.length > 0 && geoFiltered.length === 0 && (
        <p className="bkct-empty">Ningún contacto coincide con la búsqueda o el filtro.</p>
      )}

      {geoFiltered.length > 0 && (
        <div className="bkct-groups">
          {grouped.map(({ pais, provincias }) => {
            const totalPais = provincias.reduce((n, [, list]) => n + list.length, 0);
            return (
              <div key={pais} className="bkct-pais-group">
                <div className="bkct-pais-title">{pais}<span className="count">({totalPais})</span></div>
                {provincias.map(([provincia, list]) => (
                  <div key={provincia} className="bkct-provincia-group">
                    {provincias.length > 1 && <div className="bkct-provincia-title">{provincia}</div>}
                    <div className="bkct-grid">
                      {list.map((c) => (
                        <div key={c.id} className="bkct-item">
                          <div className="bkct-name">{c.nombre} {c.apellido ?? ""}</div>
                          {c.venueNombre && <div className="bkct-venue">{c.venueNombre}</div>}
                          <div className="bkct-meta">
                            {c.telefono && <span>📞 {c.telefono}</span>}
                            {c.whatsapp && <span>WhatsApp: {c.whatsapp}</span>}
                            {c.instagram && <span>IG: {c.instagram}</span>}
                            {c.email && <span>{c.email}</span>}
                          </div>
                          <button className="bkct-edit-btn" onClick={() => setEditing(c)}>Editar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ContactModal
          contact={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function ContactModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: BookingContact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(contact?.nombre ?? "");
  const [apellido, setApellido] = useState(contact?.apellido ?? "");
  const [venueNombre, setVenueNombre] = useState(contact?.venueNombre ?? "");
  const [telefono, setTelefono] = useState(contact?.telefono ?? "");
  const [whatsapp, setWhatsapp] = useState(contact?.whatsapp ?? "");
  const [instagram, setInstagram] = useState(contact?.instagram ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [provincia, setProvincia] = useState(contact?.provincia ?? "");
  const [pais, setPais] = useState(contact?.pais ?? "");
  const [observaciones, setObservaciones] = useState(contact?.observaciones ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = contact ? `/api/booking/contacts/${encodeURIComponent(contact.id)}` : "/api/booking/contacts";
      const res = await fetch(url, {
        method: contact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, apellido: apellido || null, venueNombre: venueNombre || null, telefono: telefono || null,
          whatsapp: whatsapp || null, instagram: instagram || null, email: email || null, observaciones: observaciones || null,
          provincia: provincia || null, pais: pais || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirm("¿Eliminar este contacto?")) return;
    setSaving(true);
    await fetch(`/api/booking/contacts/${encodeURIComponent(contact.id)}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="bkct-modal-overlay" onClick={onClose}>
      <form className="bkct-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{contact ? "Editar contacto" : "Nuevo contacto"}</h2>

        <div className="bkct-field-row">
          <div className="bkct-field">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="bkct-field">
            <label>Apellido</label>
            <input value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </div>
        </div>

        <div className="bkct-field">
          <label>Boliche / venue</label>
          <input value={venueNombre} onChange={(e) => setVenueNombre(e.target.value)} />
        </div>

        <div className="bkct-field-row">
          <div className="bkct-field">
            <label>Provincia</label>
            <input value={provincia} onChange={(e) => setProvincia(e.target.value)} />
          </div>
          <div className="bkct-field">
            <label>País</label>
            <input value={pais} onChange={(e) => setPais(e.target.value)} />
          </div>
        </div>

        <div className="bkct-field-row">
          <div className="bkct-field">
            <label>Teléfono</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div className="bkct-field">
            <label>WhatsApp</label>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>

        <div className="bkct-field-row">
          <div className="bkct-field">
            <label>Instagram</label>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div className="bkct-field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="bkct-field">
          <label>Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
        </div>

        {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}

        <div className="bkct-modal-actions">
          {contact ? (
            <button type="button" className="bkct-btn-danger" onClick={handleDelete} disabled={saving}>
              Eliminar
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="bkct-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="bkct-btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
