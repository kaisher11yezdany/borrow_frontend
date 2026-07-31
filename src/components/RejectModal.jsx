import { useState } from "react";
import Modal from "./Modal";

export default function RejectModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not reject");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Reject lead</h2>
      <p className="subtle">Add a reason — this goes out to the partner and their upline so it can be corrected and resubmitted.</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Reason</label>
          <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Reject</button>
        </div>
      </form>
    </Modal>
  );
}
