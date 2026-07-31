import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import StageFields, { defaultStageFields } from "../StageFields";
import { LeadsAPI, SettingsAPI } from "../../api/endpoints";

export default function FixDisbursementModal({ lead, onClose }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const [fields, setFields] = useState(() => defaultStageFields("Disbursement Done", lead));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await LeadsAPI.fixDisbursement(lead._id, fields);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["verification-badge"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not resubmit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Fix & resubmit disbursement</h2>
      <p className="subtle">{lead.customerName} · Final check rejected: "{lead.finalVerification.note}"</p>
      <form onSubmit={onSubmit}>
        <StageFields next="Disbursement Done" lead={lead} fields={fields} setFields={setFields} banksByProduct={settings?.banksByProduct} />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Resubmit</button>
        </div>
      </form>
    </Modal>
  );
}
