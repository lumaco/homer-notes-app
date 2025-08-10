import React, { useEffect, useMemo, useRef, useState } from "react";

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
  const [imagePreview, setImagePreview] = useState(undefined);

  const [editing, setEditing] = useState(null);   // { id, text, imageUrl, createdAt }
  const [sharing, setSharing] = useState(null);   // note
  const [viewing, setViewing] = useState(null);   // note

  const [isCoarse, setIsCoarse] = useState(false);
  const dragId = useRef(null); // desktop DnD
  const touchDrag = useRef({ id: null, lastX: 0, lastY: 0 }); // mobile DnD

  /** load/save **/
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notes") || "[]");
      setNotes(Array.isArray(saved) ? saved : []);
    } catch {
      setNotes([]);
    }
  }, []);

  const saveNotes = (arr) => {
    setNotes(arr);
    try { localStorage.setItem("notes", JSON.stringify(arr)); } catch {}
  };

  /** env **/
  useEffect(() => {
    try {
      const coarse =
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
        (typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches);
      setIsCoarse(!!coarse);
    } catch {}
  }, []);

  /** actions **/
  const createNote = () => {
    if (!draft.trim() && !imagePreview) return;
    const n = {
      id: uid(),
      text: draft.trim(),
      imageUrl: imagePreview || null,
      createdAt: Date.now(),
    };
    saveNotes([n, ...notes]);
    setDraft("");
    setImagePreview(undefined);
  };

  const onDelete = (id) => saveNotes(notes.filter((n) => n.id !== id));
  const onEdit   = (note) => setEditing(note);

  const onShare = (note) => {
    const shareUrl = `${window.location.origin}/n/${note.id}`;
    if (navigator.share) {
      navigator.share({ title: "Nota", text: note.text || "", url: shareUrl });
    } else {
      setSharing(note);
    }
  };

  /** clipboard & files **/
  const onPasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setDraft((prev) => (prev ? prev + text : text));
      } else {
        alert("Permessi clipboard non disponibili sul browser.");
      }
    } catch {
      alert("Impossibile incollare. Verifica i permessi.");
    }
  };

  const onFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await blobToDataURL(file);
    setImagePreview(url);
  };

  /** DnD desktop **/
  const handleDragStart = (id) => (e) => {
    if (isCoarse) return;
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (id) => (e) => {
    if (isCoarse) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (id) => (e) => {
    if (isCoarse) return;
    e.preventDefault();
    const from = dragId.current;
    const to = id;
    dragId.current = null;
    if (!from || !to || from === to) return;
    reorder(from, to);
  };

  /** DnD mobile (touch) **/
  const onTouchStartCard = (id) => (e) => {
    if (!isCoarse) return;
    const t = e.touches[0];
    touchDrag.current = { id, lastX: t.clientX, lastY: t.clientY };

    const onMove = (ev) => {
      ev.preventDefault(); // evitiamo lo scroll mentre trascini
      const t2 = ev.touches[0];
      touchDrag.current.lastX = t2.clientX;
      touchDrag.current.lastY = t2.clientY;
    };
    const onEnd = (ev) => {
      ev.preventDefault();
      const { id: from, lastX, lastY } = touchDrag.current;
      const el = document.elementFromPoint(lastX, lastY);
      const dropCard = el && el.closest && el.closest("[data-note-id]");
      if (dropCard) {
        const to = dropCard.getAttribute("data-note-id");
        if (from && to && from !== to) reorder(from, to);
      }
      window.removeEventListener("touchmove", onMove, { capture: true });
      window.removeEventListener("touchend", onEnd, { capture: true });
      window.removeEventListener("touchcancel", onEnd, { capture: true });
    };

    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: false, capture: true });
    window.addEventListener("touchcancel", onEnd, { passive: false, capture: true });
  };

  const reorder = (fromId, toId) => {
    const arr = [...notes];
    const fromIdx = arr.findIndex((n) => n.id === fromId);
    const toIdx   = arr.findIndex((n) => n.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveNotes(arr);
  };

  /** rendering **/
  return (
    <div className="min-h-screen text-zinc-100 bg-[#121212]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <img
              src="/logo-homer.png"
              alt="Homer logo"
              className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-xl font-semibold">Homer and Golden Epic Notes</h1>
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
            <button
              onClick={onPasteText}
              className="btn-secondary w-full sm:flex-1 md:w-full"
              title="Incolla testo dalla clipboard"
            >
              <span className="opacity-80">⌘V</span>
              <span>Incolla</span>
            </button>

            <label className="btn-secondary w-full sm:flex-1 md:w-full cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFileSelect}
              />
              <span role="img" aria-label="camera">📷</span>
              <span>Aggiungi foto</span>
            </label>

            <button onClick={createNote} className="btn-primary w-full sm:flex-1 md:w-full">
              + Crea nota
            </button>
          </div>
        </div>

        {imagePreview && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={imagePreview}
              alt="preview"
              className="h-24 w-24 object-cover rounded-xl border border-white/10"
            />
            <button className="btn-ghost" onClick={() => setImagePreview(undefined)}>
              Rimuovi immagine
            </button>
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
              className="note-card p-4 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_80px_-40px] shadow-sky-500/20"
              draggable={!isCoarse}
              onDragStart={handleDragStart(n.id)}
              onDragOver={handleDragOver(n.id)}
              onDrop={handleDrop(n.id)}
              onTouchStart={onTouchStartCard(n.id)}
            >
              {n.imageUrl && (
                <img
                  src={n.imageUrl}
                  alt="nota"
                  className="w-full h-40 object-cover rounded-xl border border-white/10 mb-3"
                  onClick={() => setViewing(n)}
                />
              )}
              {n.text && <p className="mb-3 whitespace-pre-wrap">{n.text}</p>}
              <div className="flex items-center justify-between text-xs opacity-70">
                <time dateTime={String(n.createdAt)}>{fmt(n.createdAt)}</time>
                <div className="flex gap-1">
                  <button className="pill" onClick={(e) => { e.stopPropagation(); setEditing(n); }}>✏️</button>
                  <button className="pill" onClick={(e) => { e.stopPropagation(); onShare(n); }}>🔗</button>
                  <button className="pill danger" onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}>🗑️</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Modals */}
      {editing && (
        <Modal title="Modifica nota" onClose={() => setEditing(null)}>
          <EditForm
            note={editing}
            onCancel={() => setEditing(null)}
            onSave={(text) => {
              const arr = notes.map((x) => (x.id === editing.id ? { ...x, text } : x));
              saveNotes(arr);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {sharing && (
        <Modal title="Condividi nota" onClose={() => setSharing(null)}>
          <div className="flex gap-2">
            <input
              readOnly
              value={`${window.location.origin}/n/${sharing.id}`}
              className="flex-1 rounded-xl bg-black/40 outline-none border border-white/10 p-3"
            />
            <button
              className="btn-secondary"
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/n/${sharing.id}`)
              }
            >
              Copia
            </button>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title="Dettaglio nota" onClose={() => setViewing(null)}>
          {viewing.imageUrl && (
            <img
              src={viewing.imageUrl}
              alt="nota"
              className="max-h-[70vh] w-full object-contain rounded-xl border border-white/10 mb-3"
            />
          )}
          {viewing.text && <p className="whitespace-pre-wrap">{viewing.text}</p>}
        </Modal>
      )}
    </div>
  );
}

/** Modal components **/
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900/90 p-4 shadow-[0_0_120px_-40px] shadow-sky-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-ghost" onClick={onClose}>
            ✖
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditForm({ note, onSave, onCancel }) {
  const [value, setValue] = useState(note.text || "");
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full min-h-[120px] rounded-xl bg-black/40 outline-none border border-white/10 p-3"
      />
      <div className="flex justify-end gap-2">
        <button className="pill danger" onClick={onCancel}>
          Annulla
        </button>
        <button className="pill" onClick={() => onSave(value)}>
          Salva
        </button>
      </div>
    </div>
  );
}

/** Utils **/
async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
