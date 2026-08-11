import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import LeadFormFields from "../LeadFormFields";
import { LeadsAPI, SettingsAPI, TeamAPI, AttachmentsAPI } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";

export default function AddLeadModal({ onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const { data: allUsers = [] } = useQuery({ queryKey: ["team-all"], queryFn: TeamAPI.listAll });

  const activeProducts = (settings?.products || []).filter((p) => p.active);
  const [product, setProduct] = useState("");
  const [partnerId, setPartnerId] = useState(user.id);
  const [fields, setFields] = useState({ leadSource: "Referral", employmentType: "Salaried" });
  const [attachFiles, setAttachFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleProductChange(e) {
    setProduct(e.target.value);
  }

  function addFiles(e) {
    const picked = Array.from(e.target.files || []);
    setAttachFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }
  function removeFile(idx) {
    setAttachFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const selectedProduct = product || activeProducts[0]?.name;
      const selectedColor = activeProducts.find((p) => p.name === selectedProduct)?.color || "#3B82F6";
      const lead = await LeadsAPI.create({
        ...fields,
        product: selectedProduct,
        productColor: selectedColor,
        partnerId,
      });
      if (attachFiles.length > 0) {
        await AttachmentsAPI.add(lead._id, attachFiles);
      }
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["verification-badge"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Add a lead</h2>
      <p className="subtle">
        Phone number is auto-checked for possible duplicates. A flag just means a human review is needed — it won't block
        adding the lead.
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Product</label>
          <select value={product} onChange={handleProductChange} required>
            {activeProducts.length === 0 ? (
              <option value="">No active products — add one in Settings</option>
            ) : (
              activeProducts.map((p) => <option key={p._id}>{p.name}</option>)
            )}
          </select>
          <p className="subtle" style={{ fontSize: 11, marginTop: 4 }}>Color is automatically set from product settings</p>
        </div>
        <LeadFormFields fields={fields} setFields={setFields} digitalChannels={settings?.digitalChannels} showProofField={false} />
        <div className="field">
          <label>Attachments (optional)</label>
          <p className="subtle" style={{ margin: "0 0 8px", fontSize: 11 }}>
            Any file type — KYC scans, agreements, salary slips, photos. You can add more later from the Leads table too.
          </p>
          {attachFiles.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {attachFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "4px 0" }}>
                  <span style={{ wordBreak: "break-word" }}>{f.name}</span>
                  <button type="button" className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => removeFile(i)}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <label className="btn-sm" style={{ display: "inline-block", cursor: "pointer" }}>
            + Add files
            <input type="file" multiple onChange={addFiles} style={{ display: "none" }} />
          </label>
        </div>
        <div className="field">
          <label>Lead sourced by (payout owner)</label>
          <p className="subtle" style={{ margin: "0 0 8px", fontSize: 11 }}>
            Whoever is selected here gets the payout for this lead. This list includes everyone in the system, any role —
            not just Referral Partners/Sales Managers or your own team.
          </p>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
            {allUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u._id === user.id ? `${u.name} — my own lead` : `${u.name} (${u.role})`}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Add lead</button>
        </div>
      </form>
    </Modal>
  );
}
