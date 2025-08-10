import React, { useState, useEffect } from "react";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem("notes") || "[]");
    setNotes(savedNotes);
  }, []);

  const saveNotes = (newNotes) => {
    setNotes(newNotes);
    localStorage.setItem("notes", JSON.stringify(newNotes));
  };

  const createNote = () => {
    if (!note.trim()) return;
    const newNotes = [...notes, { text: note, id: Date.now() }];
    saveNotes(newNotes);
    setNote("");
  };

  const deleteNote = (id) => {
    const newNotes = notes.filter((n) => n.id !== id);
    saveNotes(newNotes);
  };

  const editNote = (id) => {
    const newText = prompt("Modifica la nota:");
    if (newText !== null) {
      const newNotes = notes.map((n) =>
        n.id === id ? { ...n, text: newText } : n
      );
      saveNotes(newNotes);
    }
  };

  const shareNote = (id) => {
    const noteToShare = notes.find((n) => n.id === id);
    if (noteToShare) {
      const shareUrl = `${window.location.origin}/?note=${encodeURIComponent(
        noteToShare.text
      )}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Link copiato negli appunti!");
      });
    }
  };

  const onPasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNote((prev) => prev + text);
    } catch (err) {
      alert("Impossibile incollare. Verifica i permessi.");
    }
  };

  const onAddPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNote((prev) => prev + "\n![immagine](" + reader.result + ")");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* HEADER */}
      <header className="flex items-center gap-3 mb-6">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-12 h-12 rounded-xl border border-white/10"
        />
        <h1 className="text-xl font-bold">Homer and Golden Epic Notes</h1>
      </header>

      {/* COMPOSER */}
      <div className="composer">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Scrivi una nota privata..."
          className="flex-1 rounded-2xl bg-white/5 border border-white/10 p-3 resize-none min-h-[120px] focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        <div className="btn-group">
          {/* Incolla */}
          <button
            onClick={onPasteText}
            className="btn-secondary w-full sm:flex-1 md:w-full"
            title="Incolla testo dalla clipboard"
          >
            <span className="opacity-80">⌘V</span>
            <span>Incolla</span>
          </button>

          {/* Aggiungi foto */}
          <label className="btn-secondary w-full sm:flex-1 md:w-full cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={onAddPhoto}
              className="hidden"
            />
            <span role="img" aria-label="camera">
              📷
            </span>
            <span>Aggiungi foto</span>
          </label>

          {/* Crea nota */}
          <button
            onClick={createNote}
            className="btn-primary w-full sm:flex-1 md:w-full"
          >
            + Crea nota
          </button>
        </div>
      </div>

      {/* LISTA NOTE */}
      <div className="mt-8">
        <h2 className="text-sm uppercase tracking-wider mb-2">Le tue note</h2>
        <div className="grid gap-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <p className="mb-3 whitespace-pre-wrap">{n.text}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteNote(n.id)}
                  className="pill danger"
                >
                  Elimina
                </button>
                <button
                  onClick={() => editNote(n.id)}
                  className="pill"
                >
                  Modifica
                </button>
                <button
                  onClick={() => shareNote(n.id)}
                  className="pill"
                >
                  Condividi
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="opacity-50">Nessuna nota presente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
