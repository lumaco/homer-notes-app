import React, { useEffect, useRef, useState } from "react";

/** Helpers **/
const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const uid = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // DnD state
  const isCoarse = matchMediaSafe("(pointer: coarse)");
  const dragging = useRef(null);
  const longPressTimer = useRef(null);

  /** load/save (local, in attesa di Neon) **/
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notes") || "[]");
      setNotes(Array.isArray(saved) ? saved : []);
    } catch { setNotes([]); }
  }, []);
  const saveNotes = (arr) => {
    setNotes(arr);
    try { localStorage.setItem("notes", JSON.stringify(arr)); } catch {}
  };

  /** actions **/
  const createNote = () => {
    if (!draft.trim() && !imagePreview) return;
    const n = { id: uid(), text: draft.trim(), imageUrl: imagePreview, createdAt: Date.now() };
    saveNotes([n, ...notes]);
    setDraft(""); setImagePreview(null);
  };
  const onDelete = (id) => saveNotes(notes.filter((n) => n.id !== id));
  const onEdit = (note) => {
    const v = prompt("Modifica nota:", note.text || "");
    if (v !== null) saveNotes(notes.map((n) => (n.id === note.id ? { ...n, text: v } : n)));
  };
  const onShare = (note) => {
    const url = `${window.location.origin}/n/${note.id}`;
    if (navigator.share) navigator.share({ title: "Nota", text: note.text, url });
    else navigator.clipboard.writeText(url);
  };

  /** clipboard & files **/
  const onPasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDraft((p) => p + text);
    } catch { alert("Permessi clipboard mancanti."); }
  };
  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  /** reorder **/
  const reorder = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    const arr = [...notes];
    const a = arr.findIndex((n) => n.id === fromId);
    const b = arr.findIndex((n) => n.id === toId);
    if (a < 0 || b < 0) return;
    const [moved] = arr.splice(a, 1);
    arr.splice(b, 0, moved);
    saveNotes(arr);
  };

  // Desktop DnD
  const onDragStart = (id) => (e) => { if (isCoarse) return; e.dataTransfer.setData("text/plain", id); };
  const onDragOver  = (id) => (e) => { if (isCoarse) return; e.preventDefault(); };
  const onDrop      = (id) => (e) => { if (isCoarse) return; e.preventDefault(); reorder(e.dataTransfer.getData("text/plain"), id); };

  // Mobile DnD (long-press)
  const onTouchStart = (id) => (e) => {
    if (!isCoarse) return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const t = e.touches[0];
    longPressTimer.current = setTimeout(() => { dragging.current = { id, x: t.clientX, y: t.clientY }; }, 180);
  };
  const onTouchMove = () => (e) => {
    if (!isCoarse) return;
    if (!dragging.current) return;
    e.preventDefault();
  };
  const onTouchEnd = () => (e) => {
    if (!isCoarse) return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!dragging.current) return;
    const t = e.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const drop = el && el.closest && el.closest("[data-note-id]");
    if (drop) reorder(dragging.current.id, drop.getAttribute("data-note-id"));
    dragging.current = null;
  };

  return (
    <div className="min-h-dvh bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <img
            src="/logo-homer.png"
            alt="Logo"
            className="h-10 w-10 rounded-xl border border-white/10 object-cover"
            onError={(e)=>{ e.currentTarget.src="/logo.png"; }}
          />
          <h1 className="text-lg md:text-xl font-semibold">Homer and Golden Epic Notes</h1>
        </div>
      </header>

      {/* Composer */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="composer neon-panel">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Scrivi una nota privata..."
            className="flex-1 rounded-2xl bg-black/40 outline-none border border-white/10 p-3 md:p-4 resize-none min-h-[120px] focus:ring-2 focus:ring-sky-500"
          />
          <div className="btn-group">
            <button onClick={onPasteText} className="btn-secondary w-full sm:flex-1 md:w-full" title="Incolla">
              <span className="opacity-80">⌘V</span><span>Incolla</span>
            </button>

            {/* niente capture -> torna la galleria */}
            <label className="btn-secondary w-full sm:flex-1 md:w-full cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
              <span role="img" aria-label="camera">📷</span><span>Aggiungi foto</span>
            </label>

            <button onClick={createNote} className="btn-primary w-full sm:flex-1 md:w-full">+ Crea nota</button>
          </div>
        </div>

        {imagePreview && (
          <div className="mt-3 flex items-center gap-3">
            <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded-xl border border-white/10" />
            <button className="btn-ghost" onClick={() => setImagePreview(null)}>Rimuovi immagine</button>
          </div>
        )}
      </section>

      {/* Notes */}
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-wider">Le tue note</h2>
          <span className="text-xs opacity-60">Trascina per riordinare</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <article
              key={n.id}
              data-note-id={n.id}
              className="note-card p-4 rounded-2xl bg-white/5 border border-white/10"
              draggable={!isCoarse}
              onDragStart={onDragStart(n.id)}
              onDragOver={onDragOver(n.id)}
              onDrop={onDrop(n.id)}
              onTouchStart={onTouchStart(n.id)}
              onTouchMove={onTouchMove(n.id)}
              onTouchEnd={onTouchEnd(n.id)}
            >
              {n.imageUrl && (
                <img
                  src={n.imageUrl}
                  alt="nota"
                  className="w-full h-40 object-cover rounded-xl border border-white/10 mb-3"
                />
              )}
              {n.text && <p className="mb-3 whitespace-pre-wrap">{n.text}</p>}

              <div className="card-actions">
                <button className="pill-danger" onClick={() => onDelete(n.id)}>Elimina</button>
                <button className="pill" onClick={() => onEdit(n)}>Modifica</button>
                <button className="pill" onClick={() => onShare(n)}>Condividi</button>
              </div>

              <div className="mt-2 text-xs opacity-70">
                <time dateTime={String(n.createdAt)}>{fmt(n.createdAt)}</time>
              </div>
            </article>
          ))}
          {notes.length === 0 && <p className="opacity-60">Nessuna nota presente.</p>}
        </div>
      </main>
    </div>
  );
}

/** Utils **/
function matchMediaSafe(q){
  try { return !!(window.matchMedia && window.matchMedia(q).matches); }
  catch { return false; }
}
