import { useQuery } from "@tanstack/react-query";
import Modal from "../Modal";
import { KYCAPI, AttachmentsAPI } from "../../api/endpoints";
import { fmtDateTime } from "../../constants";

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isImage(mimeType) {
  return mimeType && mimeType.startsWith("image/");
}

export default function LeadDetailsModal({ lead, onClose }) {
  const { data: kycData } = useQuery({
    queryKey: ["kyc", lead._id],
    queryFn: () => KYCAPI.get(lead._id),
  });
  const { data: attachments = [] } = useQuery({
    queryKey: ["attachments", lead._id],
    queryFn: () => AttachmentsAPI.listForLead(lead._id),
  });

  const kyc = kycData?.kyc || {};

  return (
    <Modal wide onClose={onClose}>
      <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ marginBottom: 8 }}>{lead.customerName} — Complete Details</h2>
        <p className="subtle" style={{ marginBottom: 16 }}>All information for approval decision</p>

        {/* Lead Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
          <div>
            <strong>Current Stage</strong>
            <p style={{ margin: "4px 0 0" }}><span className="badge gray">{lead.stage}</span></p>
          </div>
          <div>
            <strong>Product</strong>
            <p style={{ margin: "4px 0 0" }}>
              <span className="badge" style={{ backgroundColor: lead.productColor || "#3B82F6", color: "white" }}>
                {lead.product}
              </span>
            </p>
          </div>
          <div>
            <strong>Verification Status</strong>
            <p style={{ margin: "4px 0 0" }}>
              <span className={`badge ${lead.verification.status === "verified" ? "green" : lead.verification.status === "rejected" ? "red" : "amber"}`}>
                {lead.verification.status.charAt(0).toUpperCase() + lead.verification.status.slice(1)}
              </span>
            </p>
          </div>
          <div>
            <strong>Final Verification</strong>
            <p style={{ margin: "4px 0 0" }}>
              <span className={`badge ${lead.finalVerification.status === "verified" ? "green" : "gray"}`}>
                {lead.finalVerification.status.charAt(0).toUpperCase() + lead.finalVerification.status.slice(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Personal Information */}
        <div style={{ marginBottom: 20 }}>
          <h3>Personal Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
            <div>
              <strong>Name</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.customerName || "—"}</p>
            </div>
            <div>
              <strong>Phone</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.phone || "—"}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.email || "—"}</p>
            </div>
            <div>
              <strong>City</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.city || "—"}</p>
            </div>
            <div>
              <strong>Occupation</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.occupation || "—"}</p>
            </div>
            <div>
              <strong>Employment Type</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{lead.employmentType || "—"}</p>
            </div>
          </div>
        </div>

        {/* KYC Information */}
        <div style={{ marginBottom: 20 }}>
          <h3>KYC Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
            <div>
              <strong>Marital Status</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.maritalStatus ? kyc.maritalStatus.charAt(0).toUpperCase() + kyc.maritalStatus.slice(1) : "—"}</p>
            </div>
            <div>
              <strong>Spouse Name</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.spouseName || "—"}</p>
            </div>
            <div>
              <strong>Mother Name</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.motherName || "—"}</p>
            </div>
            <div>
              <strong>Number of Dependents</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.numberOfDependents ?? "—"}</p>
            </div>
            <div>
              <strong>Work Experience (Current)</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.workExperienceCurrentCompany || "—"}</p>
            </div>
            <div>
              <strong>Total Work Experience</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.totalWorkExperience || "—"}</p>
            </div>
            <div>
              <strong>Years at Current Address</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.yearsAtCurrentAddress ?? "—"}</p>
            </div>
            <div>
              <strong>Years in Current City</strong>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{kyc.yearsInCurrentCity ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        {(kyc.permanentAddress || kyc.currentAddress) && (
          <div style={{ marginBottom: 20 }}>
            <h3>Address Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
              {kyc.permanentAddress && (
                <div>
                  <strong>Permanent Address</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{kyc.permanentAddress}</p>
                  {kyc.permanentLandmark && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Landmark: {kyc.permanentLandmark}</p>
                  )}
                </div>
              )}
              {kyc.currentAddress && (
                <div>
                  <strong>Current Address</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{kyc.currentAddress}</p>
                  {kyc.currentLandmark && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Landmark: {kyc.currentLandmark}</p>
                  )}
                </div>
              )}
              {kyc.companyAddress && (
                <div>
                  <strong>Company Address</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{kyc.companyAddress}</p>
                  {kyc.companyLandmark && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Landmark: {kyc.companyLandmark}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* References */}
        {kyc.references && kyc.references.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3>References</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {kyc.references.map((ref) => (
                <div key={ref._id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4, backgroundColor: "var(--bg)" }}>
                  <strong>{ref.name}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    {ref.contact} · {ref.type === "relative" ? ref.relationship : "Friend"}
                  </p>
                  {ref.address && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{ref.address}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disbursement Details */}
        {lead.disbursement && (
          <div style={{ marginBottom: 20, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
            <h3 style={{ marginTop: 0 }}>Disbursement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <strong>Amount</strong>
                <p style={{ margin: "4px 0 0", fontSize: 14 }}>₹{lead.disbursement.amount?.toLocaleString() || "—"}</p>
              </div>
              <div>
                <strong>Status</strong>
                <p style={{ margin: "4px 0 0", fontSize: 14 }}>
                  <span className="badge gray">{lead.disbursement.status || "—"}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3>Attachments</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {attachments.map((attachment) => (
                <div key={attachment._id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4, backgroundColor: "var(--bg)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {isImage(attachment.mimeType) ? (
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      <img src={attachment.url} alt={attachment.originalName} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        width: 56, height: 56, borderRadius: 4, border: "1px solid var(--border)", background: "#EEECE7",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                        color: "var(--ink-soft)", textAlign: "center", flex: "0 0 auto", textDecoration: "none",
                      }}
                    >
                      {(attachment.originalName.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}
                    </a>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{attachment.label || attachment.originalName}</span>
                    </div>
                    {attachment.label && <div className="subtle" style={{ fontSize: 11, margin: "2px 0" }}>{attachment.originalName}</div>}
                    <div className="subtle" style={{ fontSize: 11 }}>
                      {formatBytes(attachment.size)} · {attachment.uploadedBy?.name || "Unknown"} · {fmtDateTime(attachment.createdAt)}
                    </div>
                    <a href={attachment.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                      {isImage(attachment.mimeType) ? "View full size" : "Download"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
