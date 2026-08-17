import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { NotesAPI } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { fmtDateTime } from "../constants";

function NoteRow({ note, canModify, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSave(note._id, text.trim());
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save note");
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <div className="card" style={{ marginBottom: 10, padding: 12 }}>
        <form onSubmit={save}>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} required autoFocus />
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn-sm" onClick={() => { setEditing(false); setText(note.text); }}>Cancel</button>
            <button type="submit" className="btn-sm btn-primary" disabled={submitting}>Save</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span className="subtle" style={{ margin: 0, fontSize: 11 }}>
          <b style={{ color: "var(--ink)" }}>{note.createdBy?.name || "Unknown"}</b> · {fmtDateTime(note.createdAt)}
          {note.edited && " (edited)"}
        </span>
        {canModify && (
          <span style={{ whiteSpace: "nowrap" }}>
            <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
            <button className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => onDelete(note._id)}>Delete</button>
          </span>
        )}
      </div>
      <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>{note.text}</p>
    </div>
  );
}

export default function NotesModal({ lead, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: notes = [], refetch } = useQuery({
    queryKey: ["notes", lead._id, "note"],
    queryFn: () => NotesAPI.listForLead(lead._id, "note"),
  });

  async function addNote(e) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await NotesAPI.add(lead._id, text.trim(), "note");
      setText("");
      refetch();
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      setError(err.response?.data?.error || "Could not add note");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveNote(id, newText) {
    await NotesAPI.update(id, newText);
    refetch();
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    await NotesAPI.remove(id);
    refetch();
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>Notes — {lead.customerName}</h2>
      <p className="subtle">A running log of notes on this lead, each stamped with who wrote it and when.</p>
      <div style={{ maxHeight: 360, overflow: "auto", marginBottom: 14 }}>
        {notes.length === 0 ? (
          <p className="subtle">No notes yet — add the first one below.</p>
        ) : (
          notes.map((n) => (
            <NoteRow
              key={n._id}
              note={n}
              canModify={user.role === "Admin" || n.createdBy?._id === user.id}
              onSave={saveNote}
              onDelete={deleteNote}
            />
          ))
        )}
      </div>
      <form onSubmit={addNote}>
        <div className="field">
          <label>Add a note</label>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What's worth recording about this lead?" required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Add note</button>
        </div>
      </form>
    </Modal>
  );
}
