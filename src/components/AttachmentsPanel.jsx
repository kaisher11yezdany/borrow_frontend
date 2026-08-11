import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentsAPI } from "../api/endpoints";
import { fileUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { fmtDateTime } from "../constants";

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isImage(mimeType) {
  return mimeType && mimeType.startsWith("image/");
}

function AttachmentRow({ attachment, canModify, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(attachment.label || "");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setError("");
    setSubmitting(true);
    try {
      await onSave(attachment._id, { label, file });
      setEditing(false);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    // Plain divs, not a <form> — this panel can be embedded inside another
    // form (Edit Lead), and nested <form> elements are invalid HTML and
    // misbehave (the "Save" button below could end up submitting the
    // outer form instead of just this attachment).
    return (
      <div className="card" style={{ marginBottom: 10, padding: 12 }}>
        <div className="field">
          <label>Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="e.g. Salary slip — March"
          />
        </div>
        <div className="field">
          <label>Replace file (optional)</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn-sm" onClick={() => { setEditing(false); setLabel(attachment.label || ""); setFile(null); }}>Cancel</button>
          <button type="button" className="btn-sm btn-primary" disabled={submitting} onClick={save}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 10, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
      {isImage(attachment.mimeType) ? (
        <a href={fileUrl(attachment.url)} target="_blank" rel="noreferrer">
          <img src={fileUrl(attachment.url)} alt={attachment.originalName} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
        </a>
      ) : (
        <a
          href={fileUrl(attachment.url)}
          target="_blank"
          rel="noreferrer"
          style={{
            width: 56, height: 56, borderRadius: 6, border: "1px solid var(--border)", background: "#EEECE7",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
            color: "var(--ink-soft)", textAlign: "center", flex: "0 0 auto", textDecoration: "none",
          }}
        >
          {(attachment.originalName.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}
        </a>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{attachment.label || attachment.originalName}</span>
          {canModify && (
            <span style={{ whiteSpace: "nowrap" }}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
              <button type="button" className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => onDelete(attachment._id)}>Delete</button>
            </span>
          )}
        </div>
        {attachment.label && <div className="subtle" style={{ fontSize: 11, margin: "2px 0" }}>{attachment.originalName}</div>}
        <div className="subtle" style={{ fontSize: 11 }}>
          {formatBytes(attachment.size)} · {attachment.uploadedBy?.name || "Unknown"} · {fmtDateTime(attachment.createdAt)}
        </div>
        <a href={fileUrl(attachment.url)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
          {isImage(attachment.mimeType) ? "View full size" : "Download"}
        </a>
      </div>
    </div>
  );
}

// Shared list + upload/edit/delete UI, reused by AttachmentsModal (the
// standalone "Attachments" link from the Leads table) and embedded inline
// in EditLeadModal (where the lead already has an id, unlike Add Lead).
export default function AttachmentsPanel({ lead, showLabel = true }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const { data: attachments = [], refetch } = useQuery({
    queryKey: ["attachments", lead._id],
    queryFn: () => AttachmentsAPI.listForLead(lead._id),
  });

  async function onFilesSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      await AttachmentsAPI.add(lead._id, files);
      refetch();
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      setError(err.response?.data?.error || "Could not upload file(s)");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveAttachment(id, { label, file }) {
    await AttachmentsAPI.update(id, { label, file });
    refetch();
  }

  async function deleteAttachment(id) {
    if (!window.confirm("Delete this attachment? This can't be undone.")) return;
    await AttachmentsAPI.remove(id);
    refetch();
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <div className="field">
      {showLabel && <label>Attachments</label>}
      <div style={{ maxHeight: 320, overflow: "auto", marginBottom: 10 }}>
        {attachments.length === 0 ? (
          <p className="subtle" style={{ margin: "0 0 8px" }}>No attachments yet — add the first one below.</p>
        ) : (
          attachments.map((a) => (
            <AttachmentRow
              key={a._id}
              attachment={a}
              canModify={user.role === "Admin" || a.uploadedBy?._id === user.id}
              onSave={saveAttachment}
              onDelete={deleteAttachment}
            />
          ))
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={onFilesSelected} />
      <button type="button" className="btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        {uploading ? "Uploading…" : "+ Add attachment"}
      </button>
    </div>
  );
}
