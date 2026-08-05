import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import LeadFormFields from "../LeadFormFields";
import AttachmentsPanel from "../AttachmentsPanel";
import KYCForm from "../KYCForm";
import { LeadsAPI, SettingsAPI, KYCAPI } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";

function KYCSharingSection({ lead }) {
  const [kyc, setKYC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadKYC();
  }, [lead._id]);

  async function loadKYC() {
    try {
      setLoading(true);
      const data = await KYCAPI.get(lead._id);
      const kycData = data.kyc || data;
      setKYC(kycData);
    } catch (err) {
      console.error("Failed to load KYC:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    try {
      setError("");
      if (kyc.isShared) {
        await KYCAPI.revokeAll(lead._id);
        setSuccess("KYC link is now not shared");
      } else {
        await KYCAPI.share(lead._id);
        setSuccess("KYC link is now shared");
      }
      setTimeout(() => setSuccess(""), 3000);
      loadKYC();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update sharing");
    }
  }

  if (loading) return <p className="subtle">Loading KYC sharing...</p>;
  if (!kyc) return <p className="subtle">KYC not available</p>;

  const shareLink = `${window.location.origin}/kyc/${kyc.uniqueToken}`;

  return (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <h3>Share KYC Information</h3>
      {error && (
        <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--green)", marginBottom: 12, padding: "10px", backgroundColor: "var(--green-soft)", borderRadius: "4px" }}>
          {success}
        </div>
      )}

      {/* Share Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>Status</strong>
          <p style={{ margin: "4px 0 0", fontSize: 14 }}>
            <span className={`badge ${kyc.isShared ? "green" : "gray"}`}>{kyc.isShared ? "Shared" : "Not Shared"}</span>
          </p>
        </div>
        <div>
          <strong>Shared With</strong>
          <p style={{ margin: "4px 0 0", fontSize: 14 }}>
            {kyc.sharedWith?.length || 0} {kyc.sharedWith?.length === 1 ? "person" : "people"}
          </p>
        </div>
      </div>

      {/* Link Section */}
      <div style={{ backgroundColor: "white", padding: 12, borderRadius: 4, marginBottom: 12, border: "1px solid var(--border)" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600 }}>KYC Link</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="text" value={shareLink} readOnly style={{ flex: 1, padding: "8px", borderRadius: 4, border: "1px solid var(--border)" }} />
          <button
            className="btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              setSuccess("Link copied to clipboard");
              setTimeout(() => setSuccess(""), 3000);
            }}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Share Toggle Button */}
      <div style={{ marginTop: 16 }}>
        <button
          className={kyc.isShared ? "btn-primary" : "btn-ghost"}
          onClick={handleShare}
          style={{
            minWidth: 120,
            color: kyc.isShared ? "white" : "var(--red)",
            border: kyc.isShared ? "none" : `1px solid var(--red)`
          }}
        >
          {kyc.isShared ? "✓ Shared" : "Not Shared"}
        </button>
      </div>
    </div>
  );
}

export default function EditLeadModal({ lead, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const [fields, setFields] = useState({ ...lead });
  const [productColor, setProductColor] = useState(lead.productColor || "#3B82F6");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

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
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Lead: {lead.customerName}</h2>
        {activeTab === "basic" && <p className="subtle">{helpText}</p>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab("basic")}
          style={{
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            borderBottom: activeTab === "basic" ? "2px solid var(--blue)" : "transparent",
            color: activeTab === "basic" ? "var(--blue)" : "var(--text)",
            cursor: "pointer",
            fontWeight: activeTab === "basic" ? "600" : "normal",
            transition: "all 0.2s",
          }}
        >
          Basic Information
        </button>
        <button
          onClick={() => setActiveTab("kyc")}
          style={{
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            borderBottom: activeTab === "kyc" ? "2px solid var(--blue)" : "transparent",
            color: activeTab === "kyc" ? "var(--blue)" : "var(--text)",
            cursor: "pointer",
            fontWeight: activeTab === "kyc" ? "600" : "normal",
            transition: "all 0.2s",
          }}
        >
          📋 KYC Information
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
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
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              Save
            </button>
          </div>
        </form>
      )}

      {activeTab === "kyc" && (
        <div style={{ maxHeight: "600px", overflowY: "auto", paddingRight: 8 }}>
          <KYCForm lead={lead} onSave={() => qc.invalidateQueries({ queryKey: ["leads"] })} />
          <KYCSharingSection lead={lead} />
        </div>
      )}
    </Modal>
  );
}
