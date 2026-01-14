import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "simple_notes__v1";

/**
 * Generates a reasonably-unique id for notes without external dependencies.
 * Combines timestamp + random suffix.
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Formats a date as a short, readable string.
 * Example: "Jan 14, 2026 • 4:19 AM"
 */
function formatTimestamp(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Attempts to read notes from localStorage, returning [] on any failure.
 */
function loadNotesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape validation
    return parsed
      .filter((n) => n && typeof n === "object")
      .map((n) => ({
        id: String(n.id ?? generateId()),
        title: String(n.title ?? ""),
        body: String(n.body ?? ""),
        updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * Saves notes to localStorage. Errors are intentionally ignored (e.g., quota exceeded).
 */
function saveNotesToStorage(notes) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore persistence errors; app still works with in-memory state.
  }
}

// PUBLIC_INTERFACE
function App() {
  const [notes, setNotes] = useState(() => loadNotesFromStorage());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Editor local state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const titleInputRef = useRef(null);

  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  const editingNote = useMemo(() => notes.find((n) => n.id === editingId) ?? null, [notes, editingId]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;

    return notes.filter((n) => {
      const haystack = `${n.title}\n${n.body}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, search]);

  // Keep editor fields in sync with selected note
  useEffect(() => {
    if (!editingNote) return;
    setTitle(editingNote.title);
    setBody(editingNote.body);
  }, [editingNote]);

  // Focus title when switching into edit/new
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingId]);

  const startNew = () => {
    setEditingId("NEW");
    setTitle("");
    setBody("");
  };

  const startEdit = (id) => {
    setEditingId(id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) cancelEdit();
  };

  const saveCurrent = (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle && !trimmedBody) return;

    const now = new Date().toISOString();

    if (editingId === "NEW") {
      const newNote = {
        id: generateId(),
        title: trimmedTitle || "Untitled",
        body: trimmedBody,
        updatedAt: now,
      };
      setNotes((prev) => [newNote, ...prev]);
      setEditingId(null);
      setTitle("");
      setBody("");
      return;
    }

    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: trimmedTitle || "Untitled",
                body: trimmedBody,
                updatedAt: now,
              }
            : n
        )
      );
      setEditingId(null);
      setTitle("");
      setBody("");
    }
  };

  const isEditing = editingId !== null;
  const editorHeading = editingId === "NEW" ? "New note" : "Edit note";

  return (
    <div className="App">
      <div className="page">
        <header className="appHeader">
          <div className="headerTop">
            <div className="titleBlock">
              <h1 className="appTitle">Notes</h1>
              <p className="appSubtitle">A minimal, local-only notes app.</p>
            </div>

            <button className="btn btnPrimary" onClick={startNew} type="button">
              Add note
            </button>
          </div>

          <div className="headerBottom">
            <label className="searchField">
              <span className="srOnly">Search notes</span>
              <input
                className="input"
                placeholder="Search notes by title or content…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search notes"
              />
            </label>
            <div className="metaText" aria-live="polite">
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
              {search.trim() ? " (filtered)" : ""}
            </div>
          </div>
        </header>

        <main className="layout">
          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">Your notes</h2>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="emptyState">
                <h3 className="emptyTitle">No notes found</h3>
                <p className="emptyText">
                  {notes.length === 0
                    ? "Create your first note to get started."
                    : "Try clearing your search or create a new note."}
                </p>
                <button className="btn btnPrimary" onClick={startNew} type="button">
                  Add note
                </button>
              </div>
            ) : (
              <ul className="notesList" aria-label="Notes list">
                {filteredNotes.map((note) => (
                  <li key={note.id} className={`noteItem ${note.id === editingId ? "isActive" : ""}`}>
                    <button
                      type="button"
                      className="noteMain"
                      onClick={() => startEdit(note.id)}
                      aria-label={`Edit note: ${note.title || "Untitled"}`}
                    >
                      <div className="noteTitleRow">
                        <div className="noteTitle">{note.title || "Untitled"}</div>
                        <div className="noteTime">{formatTimestamp(note.updatedAt)}</div>
                      </div>
                      {note.body ? <div className="noteBodyPreview">{note.body}</div> : <div className="noteBodyPreview noteBodyPreviewEmpty">No content</div>}
                    </button>

                    <div className="noteActions">
                      <button className="btn btnGhost" type="button" onClick={() => startEdit(note.id)}>
                        Edit
                      </button>
                      <button className="btn btnDanger" type="button" onClick={() => deleteNote(note.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2 className="panelTitle">{isEditing ? editorHeading : "Editor"}</h2>
            </div>

            {!isEditing ? (
              <div className="emptyEditor">
                <p className="emptyText">
                  Select a note to edit, or create a new one. Notes are saved locally in your browser.
                </p>
                <button className="btn btnPrimary" onClick={startNew} type="button">
                  Add note
                </button>
              </div>
            ) : (
              <form className="editor" onSubmit={saveCurrent}>
                <label className="field">
                  <span className="label">Title</span>
                  <input
                    ref={titleInputRef}
                    className="input"
                    placeholder="Untitled"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="label">Note</span>
                  <textarea
                    className="textarea"
                    placeholder="Write something…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                  />
                </label>

                <div className="editorActions">
                  <button
                    className="btn btnSuccess"
                    type="submit"
                    disabled={!title.trim() && !body.trim()}
                    aria-disabled={!title.trim() && !body.trim()}
                    title={!title.trim() && !body.trim() ? "Add a title or some content to save" : "Save note"}
                  >
                    Save
                  </button>
                  <button className="btn btnGhost" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>

                <p className="hintText">
                  Tip: Search matches both title and content. Notes persist via localStorage.
                </p>
              </form>
            )}
          </section>
        </main>

        <footer className="footer">
          <span className="footerText">Local-only • No backend • {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
