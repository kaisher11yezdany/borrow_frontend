import { useState } from "react";
import { UploadAPI } from "../api/endpoints";

// The visible defaults below (e.g. sanction amount pre-filled from loan
// amount) must be seeded into form state up front — otherwise a user who
// never touches the field submits `undefined` instead of the shown value.
export function defaultStageFields(next, lead) {
  if (next === "Sanction Done") return { sanctionAmount: lead.loanAmount };
  if (next === "Disbursement Done") {
    return {
      disbAmount: lead.sanctionAmount || lead.loanAmount,
      disbDate: new Date().toISOString().slice(0, 10),
    };
  }
  return {};
}

export default function StageFields({ next, lead, fields, setFields, banksByProduct }) {
  const [uploading, setUploading] = useState(false);

  function set(patch) {
    setFields((f) => ({ ...f, ...patch }));
  }

  async function onProofChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await UploadAPI.image(file);
      set({ proofPhotoUrl: url });
    } finally {
      setUploading(false);
    }
  }

  if (next === "Login Done") {
    const banks = (banksByProduct?.[lead.product] || []).filter((b) => b.active);
    return (
      <>
        <div className="field">
          <label>Bank <span style={{ color: "var(--red)" }}>*</span></label>
          <select value={fields.bankName || ""} onChange={(e) => set({ bankName: e.target.value })} required>
            {banks.length === 0 ? (
              <option value="">No banks set up for this product — add one in Settings</option>
            ) : (
              banks.map((b) => <option key={b._id}>{b.name}</option>)
            )}
          </select>
        </div>
        <div className="field">
          <label>DSA code <span style={{ color: "var(--red)" }}>*</span></label>
          <input value={fields.dsaCode || ""} onChange={(e) => set({ dsaCode: e.target.value })} placeholder="Required" required />
        </div>
        <div className="field">
          <label>Application ID (bank's reference) <span style={{ color: "var(--red)" }}>*</span></label>
          <input value={fields.appId || ""} onChange={(e) => set({ appId: e.target.value })} placeholder="Required" required />
        </div>
      </>
    );
  }

  if (next === "Sanction Done") {
    return (
      <div className="field">
        <label>Sanction amount (₹)</label>
        <input
          type="number"
          min="1"
          required
          value={fields.sanctionAmount ?? lead.loanAmount}
          onChange={(e) => set({ sanctionAmount: e.target.value })}
        />
      </div>
    );
  }

  if (next === "Disbursement Done") {
    return (
      <>
        <div className="field">
          <label>Disbursed amount (₹)</label>
          <input
            type="number"
            min="1"
            required
            value={fields.disbAmount ?? (lead.sanctionAmount || lead.loanAmount)}
            onChange={(e) => set({ disbAmount: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Disbursement date</label>
          <input
            type="date"
            required
            value={fields.disbDate ?? new Date().toISOString().slice(0, 10)}
            onChange={(e) => set({ disbDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Proof document <span style={{ color: "var(--red)" }}>*</span></label>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            Upload cheque, bank transfer proof, or disbursement email (PDF, JPEG, PNG, DOC, DOCX)
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            onChange={onProofChange}
            required={!fields.proofPhotoUrl}
            disabled={uploading}
          />
          {uploading && <span className="subtle" style={{ fontSize: 11, color: "var(--blue)", marginTop: 4 }}>Uploading…</span>}
          {fields.proofPhotoUrl && (
            <div style={{ marginTop: 8, padding: 8, background: "var(--green-light)", borderRadius: 4, fontSize: 12, color: "var(--green)" }}>
              ✓ Document uploaded successfully
            </div>
          )}
        </div>
        <div className="field">
          <label>Reference note (optional)</label>
          <input value={fields.proofNote || ""} onChange={(e) => set({ proofNote: e.target.value })} placeholder="e.g. cheque #12345, transaction ID, bank confirmation email" />
        </div>
        <p className="subtle" style={{ marginBottom: 0 }}>
          After uploading proof, you'll get a chance to review everything and submit for final verification. Documents will be
          stored securely for record-keeping.
        </p>
      </>
    );
  }

  return null;
}
