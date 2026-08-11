import { useState } from "react";
import { UploadAPI } from "../api/endpoints";

export default function LeadFormFields({ fields, setFields, digitalChannels, showProofField = true }) {
  const [uploading, setUploading] = useState(false);
  const isDigital = fields.leadSource === "Digital Marketing";

  function set(patch) {
    setFields((f) => ({ ...f, ...patch }));
  }

  async function onProofChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await UploadAPI.image(file);
      set({ verificationProofUrl: url });
    } finally {
      setUploading(false);
    }
  }

  const activeChannels = (digitalChannels || []).filter((c) => c.active);

  return (
    <>
      <div className="field">
        <label>Customer name *</label>
        <input value={fields.customerName || ""} onChange={(e) => set({ customerName: e.target.value })} required />
      </div>
      <div className="field">
        <label>Phone number *</label>
        <input
          value={fields.phone || ""}
          onChange={(e) => set({ phone: e.target.value })}
          required
          pattern="[0-9]{10}"
          title="10 digit phone number"
        />
      </div>
      <div className="field">
        <label>Alternate phone</label>
        <input value={fields.altPhone || ""} onChange={(e) => set({ altPhone: e.target.value })} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={fields.email || ""} onChange={(e) => set({ email: e.target.value })} />
      </div>
      <div className="field">
        <label>Loan amount (₹)</label>
        <input type="number" min="1" value={fields.loanAmount || ""} onChange={(e) => set({ loanAmount: e.target.value })} />
      </div>
      <div className="field">
        <label>Loan type</label>
        <select value={fields.loanType || ""} onChange={(e) => set({ loanType: e.target.value })}>
          <option value="">-- Select loan type --</option>
          <option value="Secure">Secure</option>
          <option value="Unsecure">Unsecure</option>
        </select>
      </div>
      <div className="field">
        <label>Monthly income (₹)</label>
        <input type="number" min="0" value={fields.monthlyIncome || ""} onChange={(e) => set({ monthlyIncome: e.target.value })} />
      </div>
      <div className="field">
        <label>Employment type</label>
        <select value={fields.employmentType || "Salaried"} onChange={(e) => set({ employmentType: e.target.value })}>
          <option>Salaried</option>
          <option>Self-employed</option>
        </select>
      </div>
      <div className="field">
        <label>Lead source</label>
        <select
          value={fields.leadSource || "Referral"}
          onChange={(e) => set({ leadSource: e.target.value, leadChannel: e.target.value === "Digital Marketing" ? fields.leadChannel : "" })}
        >
          <option>Walk-in</option>
          <option>Referral</option>
          <option>Digital Marketing</option>
        </select>
      </div>
      {isDigital && (
        <div className="field">
          <label>Channel</label>
          <select value={fields.leadChannel || ""} onChange={(e) => set({ leadChannel: e.target.value })}>
            {activeChannels.length === 0 ? (
              <option value="">Add a channel in Settings first</option>
            ) : (
              activeChannels.map((c) => <option key={c._id}>{c.name}</option>)
            )}
          </select>
        </div>
      )}
      <div className="field">
        <label>City</label>
        <input value={fields.city || ""} onChange={(e) => set({ city: e.target.value })} />
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea rows={2} value={fields.notes || ""} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      {showProofField && (
        <div className="field">
          <label>ID / KYC proof photo (optional)</label>
          <input type="file" accept="image/*" onChange={onProofChange} />
          {uploading && <span className="subtle" style={{ fontSize: 11 }}>Uploading…</span>}
          {fields.verificationProofUrl && !uploading && <span className="subtle" style={{ fontSize: 11 }}>Photo attached.</span>}
        </div>
      )}
    </>
  );
}
