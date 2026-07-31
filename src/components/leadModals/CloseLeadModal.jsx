import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { LeadsAPI } from "../../api/endpoints";

export default function CloseLeadModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("withdrawn");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await LeadsAPI.close(lead._id, { status, reason });
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not close lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Close lead</h2>
      <p className="subtle">
        {lead.customerName} · {lead.product}. This takes it out of the active pipeline but keeps the record for history — it
        won't count toward earnings or show up in Verification. Admin can reopen it later if needed.
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Reason</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} required>
            <option value="withdrawn">Customer backed off (Withdrawn)</option>
            <option value="declined">Loan rejected by bank (Declined)</option>
          </select>
        </div>
        <div className="field">
          <label>Details</label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. customer opted for another lender / bank rejected due to low CIBIL score"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Close lead</button>
        </div>
      </form>
    </Modal>
  );
}
