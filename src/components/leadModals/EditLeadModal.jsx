import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import LeadFormFields from "../LeadFormFields";
import AttachmentsPanel from "../AttachmentsPanel";
import { LeadsAPI, SettingsAPI } from "../../api/endpoints";

export default function EditLeadModal({ lead, onClose }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const [fields, setFields] = useState({ ...lead });
  const [productColor, setProductColor] = useState(lead.productColor || "#3B82F6");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeProducts = (settings?.products || []).filter((p) => p.active);

  function handleProductChange(productName) {
    const selectedProduct = activeProducts.find((p) => p.name === productName);
    setFields((f) => ({ ...f, product: productName }));
    setProductColor(selectedProduct?.color || "#3B82F6");
  }

  let helpText = "Editing details for this lead.";
  if (lead.verification.status === "rejected") helpText = "This lead was rejected — saving will resubmit it for review.";
  else if (lead.verification.status === "verified")
    helpText = "Admin override: this lead is already verified — saving will notify the reporting chain.";

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await LeadsAPI.update(lead._id, { ...fields, productColor });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["verification-badge"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>Edit lead</h2>
      <p className="subtle">{helpText}</p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Product</label>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <select value={fields.product || ""} onChange={(e) => handleProductChange(e.target.value)} style={{ flex: 1 }}>
              {activeProducts.map((p) => (
                <option key={p._id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ margin: 0 }}>Color</label>
              <input
                type="color"
                value={productColor}
                onChange={(e) => setProductColor(e.target.value)}
                style={{ width: 50, height: 40, cursor: "pointer", border: "1px solid var(--gray)" }}
              />
            </div>
          </div>
        </div>
        <LeadFormFields fields={fields} setFields={setFields} digitalChannels={settings?.digitalChannels} showProofField={false} />
        <AttachmentsPanel lead={lead} />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
