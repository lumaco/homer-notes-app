import React, { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";

/* Utils */
const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const mm = (q) => {
  try { return !!(window.matchMedia && window.matchMedia(q).matches); }
  catch { return false; }
};
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function App() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [viewer, setViewer] = useState(null);

  const isCoarse = mm("(pointer: coarse)");
  const dragging = useRef(null);
  const longPressTimer = useRef(null);

  /* Fetch notes from Neon */
  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/getNotes");
      if (!res.ok) throw new Error("Errore caricamento note");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
      alert("Errore caricamento note dal server");
    }
  };
  useEffect(() => { fetchNotes(); }, []);

  /* CREATE — Aggiornamento ottimistico + reset immediato input */
  const createNote = async () => {
    if (!draft.trim() && !imagePreview) return;

    // nota “finta” per feedback immediato
    const tempId = `temp-${Date.now()}`;
    const tempNote = {
      id: tempId,
      text: draft.trim(),
      image_url: imagePreview || null,
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [tempNote, ...prev]);     // UI istantanea
    setDraft("");                                // pulisco input
    setImagePreview(null);                       // pulisco preview

    try {
      const res = await fetch("/api/addNote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tempNote.text, image_url: tempNote.image_url }),
      });
      if (!res.ok) throw new Error("Errore creazione nota");
      const saved = await res.json();

      // rimpiazzo la temp con quella reale dal DB
      setNotes((prev) => prev.map((n) => (n.id === tempId ? saved : n)));
    } catch (err) {
      console.error(err);
      // rimuovo la temp e ripristino input in caso di errore
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setDraft(tempNote.text);
      setImagePreview(tempNote.image_url);
      alert("Errore salvataggio nota");
    }
  };

  /* DELETE */
  const onDelete = async (id) => {
    try {
      const res = await fetch(`/api/deleteNote?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione nota");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
      alert("Errore eliminazione nota");
    }
  };

  /* EDIT */
  const onEdit = async (note) => {
    const v = prompt("Modifica nota:", note.text || "");
    if (v === null) return;
    try {
      const res = await fetch("/api/updateNote", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, text: v, image_url: note.image_url }),
      });
      if (!res.ok) throw new Error("Errore modifica nota");
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      console.error(err);
      alert("Errore modifica nota");
    }
  };

  /* SHARE */
  const onShare = (note) => {
    const url = `${window.location.origin}/n/${note.id}`;
    if (navigator.share) navigator.share({ title: "Nota", text: note.text, url });
    else navigator.clipboard.writeText(url);
  };

  /* Clipboard */
  const onPasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDraft((p) => p + text);
    } catch {
      alert("Permessi clipboard mancanti.");
    }
  };

  /* File select — compressione lato client prima di convertire in base64 */
  const onFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);
      const dataUrl = await fileToDataURL(compressed);
      setImagePreview(dataUrl);
    } catch (err) {
      console.error("Errore compressione immagine:", err);
      alert("Impossibile comprimere l'immagine.");
    }
  };

  /* Reorder (solo client) */
  const reorder = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setNotes((prev) => {
      const arr = [...prev];
      const a = arr.findIndex((n) => n.id === fromId);
      const b = arr.findIndex((n) => n.id === toId);
      if (a < 0 || b < 0) return prev;
      const [moved] = arr.splice(a, 1);
      arr.splice(b, 0, moved);
      return arr;
    });
  };

  /* DnD desktop - handle */
  const onHandleDragStart = (id) => (e) => {
    if (isCoarse) return;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCardDragOver = (id) => (e) => {
    if (isCoarse) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onCardDrop = (id) => (e) => {
    if (isCoarse) return;
    e.preventDefault();
    reorder(e.dataTransfer.getData("text/plain"), id);
  };

  /* DnD mobile - long press sulla maniglia */
  const onHandleTouchStart = (id) => (e) => {
    if (!isCoarse) return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => { dragging.current = { id }; }, 180);
  };
  const onHandleTouchMove = () => (e) => {
    if (!isCoarse) return;
    if (!dragging.current) return;
    e.preventDefault();
  };
  const onHandleTouchEnd = () => (e) => {
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
          <span className="text-xs opacity-60">Trascina con ☰ per riordinare</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <article
              key={n.id}
              data-note-id={n.id}
              className="note-card p-4"
              onDragOver={onCardDragOver(n.id)}
              onDrop={onCardDrop(n.id)}
            >
              <div className="card-title">
                <time className="text-xs opacity-70" dateTime={String(n.createdAt)}>{fmt(n.created_at || n.createdAt)}</time>
                <button
                  className="drag-handle pill text-sm"
                  draggable={!isCoarse}
                  onDragStart={onHandleDragStart(n.id)}
                  onTouchStart={onHandleTouchStart(n.id)}
                  onTouchMove={onHandleTouchMove(n.id)}
                  onTouchEnd={onHandleTouchEnd(n.id)}
                  title="Trascina per riordinare"
                >
                  ☰
                </button>
              </div>

              {n.image_url && (
                <img
                  src={n.image_url}
                  alt="nota"
                  className="w-full h-40 object-cover rounded-xl border border-white/10 mb-3"
                  onClick={() => setViewer({ src: n.image_url, text: n.text })}
                />
              )}

              {n.text && <p className="mb-3 whitespace-pre-wrap">{n.text}</p>}

              <div className="card-actions">
                <button className="pill-danger" onClick={() => onDelete(n.id)}>Elimina</button>
                <button className="pill" onClick={() => onEdit(n)}>Modifica</button>
                <button className="pill" onClick={() => onShare(n)}>Condividi</button>
              </div>
            </article>
          ))}
          {notes.length === 0 && <p className="opacity-60">Nessuna nota presente.</p>}
        </div>
      </main>

      {viewer && (
        <div className="modal-backdrop" onClick={() => setViewer(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewer.src}
              alt="nota"
              className="max-h-[70vh] w-full object-contain rounded-xl border border-white/10 mb-3"
            />
            {viewer.text && <p className="whitespace-pre-wrap">{viewer.text}</p>}
            <div className="mt-3 flex justify-end">
              <button className="btn-ghost" onClick={() => setViewer(null)}>Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
