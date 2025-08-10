import React, { useEffect, useMemo, useRef, useState } from "react";

// Funzione per formattare la data
const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Funzione per generare un ID univoco
const uid = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [imagePreview, setImagePreview] = useState(undefined);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const draftRef = useRef(null);
  const dragId = useRef(null); // Per il Drag & Drop su desktop

  // Stato per il Drag & Drop su mobile
  const isCoarse = useMemo(
    () => (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) || false,
    []
  );
  const itemRefs = useRef({});
  const touchState = useRef(null);

  // --- Azioni ---
  const onAddNote = () => {
    if (!draft && !imagePreview) return;
    const n = {
      id: uid(),
      text: draft || undefined,
      imageUrl: imagePreview,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [n, ...prev]);
    setDraft("");
    setImagePreview(undefined);
  };

  const onDelete = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const onEditSave = () => {
    if (!editing) return;
    setNotes((prev) => prev.map((n) => (n.id === editing.id ? editing : n)));
    setEditing(null);
  };

  const onShare = (note) => {
    const shareUrl = `${window.location.origin}/n/${note.id}`;
    if (navigator.share) {
      navigator.share({ title: "Nota", text: note.text || "", url: shareUrl });
    } else {
      setSharing(note);
    }
  };
  
  // --- Drag & Drop Desktop ---
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
    if (!from || from === id) return;
    reorderById(from, id);
    dragId.current = null;
  };

  const reorderById = (fromId, toId) => {
    setNotes((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((n) => n.id === fromId);
      const toIdx = arr.findIndex((n) => n.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  // --- Drag & Drop Mobile (Touch) ---
  const onTouchStartItem = (id) => (e) => {
    if (!isCoarse) return;
    touchState.current = { id, currentY: e.touches[0]?.clientY ?? 0 };
    document.body.style.touchAction = "none"; // Blocca lo scroll della pagina

    const onMove = (ev) => {
      if (!touchState.current) return;
      ev.preventDefault();
      const y = ev.touches[0]?.clientY ?? 0;
      touchState.current.currentY = y;
      const centers = notes.map((n) => {
        const el = itemRefs.current[n.id];
        const r = el?.getBoundingClientRect();
        return { id: n.id, c: r ? r.top + r.height / 2 : Number.POSITIVE_INFINITY };
      });
      const fromId = touchState.current.id;
      let toId = fromId;
      for (const it of centers) {
        if (y < it.c) { toId = it.id; break; }
        toId = it.id;
      }
      if (toId && toId !== fromId) reorderById(fromId, toId);
    };

    const onEnd = () => {
      document.body.style.touchAction = "";
      touchState.current = null;
      window.removeEventListener("touchmove", onMove, { capture: true });
      window.removeEventListener("touchend", onEnd, { capture: true });
      window.removeEventListener("touchcancel", onEnd, { capture: true });
    };

    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: false, capture: true });
    window.addEventListener("touchcancel", onEnd, { passive: false, capture: true });
  };


  // --- Clipboard e File ---
  const onPasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const txt = await navigator.clipboard.readText();
        if (txt) {
          setDraft((d) => (d ? d + "\n" + txt : txt));
          return;
        }
      }
      throw new Error("readText non disponibile");
    } catch {
      draftRef.current?.focus();
      console.warn("Incolla con scorciatoia (⌘V / Ctrl+V).");
    }
  };

  const onFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await blobToDataURL(file);
    setImagePreview(url);
  };

  return (
    <div className="min-h-screen text-zinc-100 bg-[#121212]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <img
              src="/logo-homer.png"
              alt="Homer logo"
              className="h-14 w-14 rounded-2xl object-cover border border-white/10 shadow-[0_0_24px_-6px] shadow-sky-500/50"
            />
          </div>
          <div className="text-lg md:text-xl font-semibold tracking-wide">Homer and Golden Epic Notes</div>
        </div>
      </header>

      {/* Composer */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-sky-500/30">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Scrivi una nota privata…"
              className="flex-1 resize-none rounded-xl bg-black/40 outline-none border border-white/10 p-4 min-h-[96px] focus:ring-2 focus:ring-sky-500/40"
            />
            <div className="flex md:flex-col gap-2 md:w-56">
              <button
                onClick={onPasteText}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-sky-400/30 bg-white/5 text-sky-100 hover:bg-white/10 hover:border-sky-300/40 shadow-[0_0_24px_-8px] shadow-sky-500/30 transition"
                title="Incolla testo dalla clipboard"
              >
                <span className="opacity-80">⌘V</span><span>Incolla</span>
              </button>
              <label
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-sky-400/30 bg-white/5 text-sky-100 hover:bg-white/10 hover:border-sky-300/40 shadow-[0_0_24px_-8px] shadow-sky-500/30 transition cursor-pointer text-center"
                title="Aggiungi foto da galleria o fotocamera"
              >
                <span className="opacity-80">📷</span><span>Aggiungi foto</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelect} />
              </label>
              <button
                onClick={onAddNote}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sky-100 bg-sky-500/20 hover:bg-sky-400/25 border border-sky-400/40 shadow-[0_10px_30px_-12px_rgba(56,189,248,0.45)] transition"
              >
                <span className="opacity-90">＋</span><span>Crea nota</span>
              </button>
            </div>
          </div>
          {imagePreview && (
            <div className="mt-3 flex items-center gap-3">
              <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded-xl border border-white/10" />
              <button className="btn-ghost" onClick={() => setImagePreview(undefined)}>Rimuovi immagine</button>
            </div>
          )}
        </div>
      </section>

      {/* Lista Note */}
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-center justify-between py-2">
          <h2 className="text-sm uppercase tracking-widest text-zinc-400">Le tue note</h2>
          <span className="text-xs text-zinc-400">{isCoarse ? "Tieni premuto e trascina" : "Trascina per riordinare"}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <article
              key={n.id}
              ref={(el) => (itemRefs.current[n.id] = el)}
              draggable={!isCoarse}
              onDragStart={handleDragStart(n.id)}
              onDragOver={handleDragOver(n.id)}
              onDrop={handleDrop(n.id)}
              onTouchStart={onTouchStartItem(n.id)}
              onClick={() => setViewing(n)}
              className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20 shadow-lg shadow-sky-500/30 transition-colors cursor-pointer select-none"
            >
              {n.imageUrl && (
                <img src={n.imageUrl} alt="nota" className="w-full h-40 object-cover rounded-xl border border-white/10 mb-3" />
              )}
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {n.text || <span className="italic text-zinc-400">(solo immagine)</span>}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <time dateTime={n.createdAt}>{fmt(n.createdAt)}</time>
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
          <textarea
            value={editing.text || ""}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            className="w-full h-40 rounded-xl bg-black/40 outline-none border border-white/10 p-4"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button className="btn-ghost" onClick={() => setEditing(null)}>Annulla</button>
            <button className="btn-primary" onClick={onEditSave}>Salva</button>
          </div>
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
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/n/${sharing.id}`)}>Copia</button>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title="Nota" onClose={() => setViewing(null)}>
          {viewing.imageUrl && (
            <img src={viewing.imageUrl} alt="nota" className="w-full max-h-[80vh] object-contain rounded-xl border border-white/10 mb-3" />
          )}
          {viewing.text && <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{viewing.text}</p>}
        </Modal>
      )}
      
      <style>{`
        .btn-primary{ @apply w-full md:w-auto px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition; }
        .btn-secondary{ @apply w-full md:w-auto px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition; }
        .btn-ghost{ @apply px-3 py-2 rounded-xl hover:bg-white/10 transition; }
        .pill{ @apply px-2.5 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10; }
        .pill.danger{ @apply hover:bg-red-500/20 border-red-500/30; }
      `}</style>
    </div>
  );
}

// Componente Modal generico
function Modal({ children, title, onClose }){
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl shadow-sky-500/40" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="btn-ghost" onClick={onClose}>✖</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Funzione helper per convertire Blob in Data URL
async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}