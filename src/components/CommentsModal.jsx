import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { NotesAPI } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { fmtDateTime } from "../constants";

function CommentRow({ note, canModify, onSave, onDelete }) {
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
      setError(err.response?.data?.error || "Could not save comment");
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <div style={{ background: "var(--bg-2)", borderLeft: "3px solid var(--blue)", padding: 12, marginBottom: 12, borderRadius: 4 }}>
        <form onSubmit={save}>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} required autoFocus />
          {error && <p className="error-text" style={{ margin: "8px 0 0" }}>{error}</p>}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn-sm" onClick={() => { setEditing(false); setText(note.text); }}>Cancel</button>
            <button type="submit" className="btn-sm btn-primary" disabled={submitting}>Save</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-2)", borderLeft: "3px solid var(--blue)", padding: 12, marginBottom: 12, borderRadius: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            {note.createdBy?.name || "Unknown"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {fmtDateTime(note.createdAt)}
            {note.edited && " (edited)"}
          </div>
        </div>
        {canModify && (
          <span style={{ whiteSpace: "nowrap", display: "flex", gap: 4 }}>
            <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => onDelete(note._id)}>Delete</button>
          </span>
        )}
      </div>
      <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.5 }}>{note.text}</p>
    </div>
  );
}

export default function CommentsModal({ lead, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], refetch } = useQuery({
    queryKey: ["comments", lead._id],
    queryFn: () => NotesAPI.listForLead(lead._id),
  });

  async function addComment(e) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await NotesAPI.add(lead._id, text.trim());
      setText("");
      refetch();
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      setError(err.response?.data?.error || "Could not add comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveComment(id, newText) {
    await NotesAPI.update(id, newText);
    refetch();
  }

  async function deleteComment(id) {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    await NotesAPI.remove(id);
    refetch();
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>Comments — {lead.customerName}</h2>
      <p className="subtle">Discussion thread on this lead. Each comment is timestamped with who added it.</p>

      <form onSubmit={addComment} style={{ marginBottom: 20, padding: 12, background: "var(--bg-2)", borderRadius: 4 }}>
        <div className="field">
          <label>Add a comment</label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share updates, observations, or next steps for this lead..."
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="submit" className="btn-primary" disabled={submitting}>Post comment</button>
        </div>
      </form>

      <div style={{ maxHeight: 500, overflowY: "auto", marginBottom: 14 }}>
        {comments.length === 0 ? (
          <p className="subtle" style={{ textAlign: "center", padding: "20px 0" }}>No comments yet — start the conversation above.</p>
        ) : (
          comments.map((c) => (
            <CommentRow
              key={c._id}
              note={c}
              canModify={user.role === "Admin" || c.createdBy?._id === user.id}
              onSave={saveComment}
              onDelete={deleteComment}
            />
          ))
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button className="btn-sm" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
