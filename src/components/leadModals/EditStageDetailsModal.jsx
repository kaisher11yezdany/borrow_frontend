import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { LeadsAPI, SettingsAPI, UploadAPI } from "../../api/endpoints";
import { STAGES } from "../../constants";
import { useAuth } from "../../auth/AuthContext";

export default function EditStageDetailsModal({ lead, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const idx = STAGES.indexOf(lead.stage);
  const banks = (settings?.banksByProduct?.[lead.product] || []).filter((b) => b.active);

  const [bankName, setBankName] = useState(lead.bankName || "");
  const [dsaCode, setDsaCode] = useState(lead.dsaCode || "");
  const [appId, setAppId] = useState(lead.appId || "");
  const [sanctionAmount, setSanctionAmount] = useState(lead.sanctionAmount || 0);
  const [disbAmount, setDisbAmount] = useState(lead.disbursement.amount || 0);
  const [disbDate, setDisbDate] = useState(lead.disbursement.date ? lead.disbursement.date.slice(0, 10) : "");
  const [proofNote, setProofNote] = useState(lead.disbursement.proofNote || "");
  const [proofPhotoUrl, setProofPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [targetStage, setTargetStage] = useState(lead.stage);
  const [stageError, setStageError] = useState("");
  const [movingStage, setMovingStage] = useState(false);

  async function moveStageBack() {
    if (targetStage === lead.stage) return;
    if (!window.confirm(`Move this lead back to "${targetStage}"? Any stage data ahead of that point is kept but the lead re-enters the pipeline from there — a final check already approved/rejected will be cleared if this takes it before Disbursement Done.`)) {
      return;
    }
    setStageError("");
    setMovingStage(true);
    try {
      await LeadsAPI.setStage(lead._id, targetStage);
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    } catch (err) {
      setStageError(err.response?.data?.error || "Could not change the stage");
    } finally {
      setMovingStage(false);
    }
  }

  async function onProofChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      setProofPhotoUrl(await UploadAPI.image(file));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = {};
      if (idx >= 2) Object.assign(body, { bankName, dsaCode, appId });
      if (idx >= 3) Object.assign(body, { sanctionAmount });
      if (idx >= 4) {
        Object.assign(body, { disbAmount, disbDate, proofNote });
        if (proofPhotoUrl) body.proofPhotoUrl = proofPhotoUrl;
      }
      await LeadsAPI.editStageDetails(lead._id, body);
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  const hasFields = idx >= 2;

  return (
    <Modal onClose={onClose}>
      <h2>Edit stage details</h2>
      <p className="subtle">
        Correct details already entered for this lead's stages — this doesn't touch the customer/loan information itself, and
        your reporting chain is notified of the change.
      </p>
      {user.role === "Admin" && idx > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "#EEECE7" }}>
          <h2>Move stage back</h2>
          <p className="subtle" style={{ marginBottom: 10 }}>
            Correcting a lead that was advanced too far. This only moves the stage backward — to go forward, use Advance
            instead so the required fields for each step are collected properly.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
              <label>Current stage</label>
              <select value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
                {STAGES.slice(0, idx + 1).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button type="button" className="btn-sm" disabled={movingStage || targetStage === lead.stage} onClick={moveStageBack}>
              {movingStage ? "Moving…" : "Update stage"}
            </button>
          </div>
          {stageError && <p className="error-text">{stageError}</p>}
        </div>
      )}
      <form onSubmit={onSubmit}>
        {!hasFields && <p className="subtle">No stage-specific data to edit yet — this fills in once the lead reaches Login Done.</p>}
        {idx >= 2 && (
          <>
            <h2>Login details</h2>
            <div className="field">
              <label>Bank</label>
              <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
                {banks.length === 0 ? (
                  <option value="">No banks set up for this product</option>
                ) : (
                  banks.map((b) => <option key={b._id}>{b.name}</option>)
                )}
              </select>
            </div>
            <div className="field">
              <label>DSA code</label>
              <input value={dsaCode} onChange={(e) => setDsaCode(e.target.value)} />
            </div>
            <div className="field">
              <label>Application ID</label>
              <input value={appId} onChange={(e) => setAppId(e.target.value)} />
            </div>
          </>
        )}
        {idx >= 3 && (
          <>
            <h2>Sanction details</h2>
            <div className="field">
              <label>Sanction amount (₹)</label>
              <input type="number" min="1" value={sanctionAmount} onChange={(e) => setSanctionAmount(e.target.value)} />
            </div>
          </>
        )}
        {idx >= 4 && (
          <>
            <h2>Disbursement details</h2>
            <div className="field">
              <label>Disbursed amount (₹)</label>
              <input type="number" min="1" value={disbAmount} onChange={(e) => setDisbAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>Disbursement date</label>
              <input type="date" value={disbDate} onChange={(e) => setDisbDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Proof (upload to replace, optional)</label>
              <input type="file" accept="image/*" onChange={onProofChange} />
              {uploading && <span className="subtle" style={{ fontSize: 11 }}>Uploading…</span>}
            </div>
            <div className="field">
              <label>Reference note</label>
              <input value={proofNote} onChange={(e) => setProofNote(e.target.value)} />
            </div>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Save changes</button>
        </div>
      </form>
    </Modal>
  );
}
