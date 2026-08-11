import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import LeadFormFields from "../LeadFormFields";
import { LeadsAPI, SettingsAPI } from "../../api/endpoints";
import { fileUrl } from "../../api/client";
import { inr, fmtDate } from "../../constants";

export default function FinalSubmitModal({ lead, onClose }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const [fields, setFields] = useState({ ...lead });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await LeadsAPI.submitFinalVerification(lead._id, fields);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["verification-badge"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit for final verification");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>Review before submitting for final verification</h2>
      <div className="help-note" style={{ borderLeft: "3px solid var(--red)", color: "var(--red)", background: "var(--red-soft)" }}>
        Once you submit, this lead can no longer be edited (only Admin can override). Check every field below carefully first.
      </div>
      <form onSubmit={onSubmit}>
        <LeadFormFields fields={fields} setFields={setFields} digitalChannels={settings?.digitalChannels} />
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Disbursement summary</h2>
          <p className="subtle" style={{ marginBottom: 0 }}>
            Bank: {lead.bankName || "—"} · DSA code: {lead.dsaCode || "—"} · App ID: {lead.appId || "—"}
            <br />
            Sanctioned: {inr(lead.sanctionAmount)} · Disbursed: {inr(lead.disbursement.amount)} on {fmtDate(lead.disbursement.date)}
            <br />
            {lead.disbursement.proofPhotoUrl ? (
              <a href={fileUrl(lead.disbursement.proofPhotoUrl)} target="_blank" rel="noreferrer">View disbursement proof</a>
            ) : (
              "No disbursement proof attached"
            )}
          </p>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel — I'll review later</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Submit for final verification</button>
        </div>
      </form>
    </Modal>
  );
}
