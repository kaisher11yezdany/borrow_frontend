import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { KYCAPI } from "../api/endpoints";

export default function PublicKYCPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [kyc, setKYC] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [visitorName, setVisitorName] = useState(localStorage.getItem("kycVisitorName") || "");
  const [hasEntered, setHasEntered] = useState(localStorage.getItem(`kyc-${token}`) === "true");
  const [formData, setFormData] = useState({});
  const [leadData, setLeadData] = useState({});
  const [references, setReferences] = useState([]);
  const [newReference, setNewReference] = useState({ name: "", contact: "", relationship: "", type: "relative", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKYC();
  }, [token]);

  async function loadKYC() {
    try {
      setLoading(true);
      const data = await KYCAPI.getByToken(token);
      const kycData = data.kyc || data;
      const leadDataResponse = data.lead || data;
      setKYC(kycData);
      setLead(leadDataResponse);
      setFormData(kycData);
      setLeadData(leadDataResponse);
      setReferences(kycData.references || []);
    } catch (err) {
      setError(err.response?.data?.error || "This KYC link is not accessible or has been revoked");
    } finally {
      setLoading(false);
    }
  }

  async function addReference() {
    if (!newReference.name || !newReference.contact) {
      setError("Name and contact are required for references");
      return;
    }
    try {
      setError("");
      const updated = await KYCAPI.addReference(kyc.leadId, newReference);
      setReferences(updated.references || []);
      setNewReference({ name: "", contact: "", relationship: "", type: "relative", address: "" });
      setSuccess("Reference added");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add reference");
    }
  }

  async function removeReference(refId) {
    try {
      setError("");
      const updated = await KYCAPI.removeReference(kyc.leadId, refId);
      setReferences(updated.references || []);
      setSuccess("Reference removed");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove reference");
    }
  }

  function handleEnter() {
    if (!visitorName.trim()) {
      setError("Please enter your name to proceed");
      return;
    }
    localStorage.setItem("kycVisitorName", visitorName);
    localStorage.setItem(`kyc-${token}`, "true");
    setHasEntered(true);
    setError("");
  }

  function updateField(field, value) {
    const leadFields = ["customerName", "phone", "email", "employmentType", "occupation", "city"];
    if (leadFields.includes(field)) {
      setLeadData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      // Prepare data with both Lead and KYC updates
      const updateData = {
        ...formData,
        leadUpdates: leadData
      };

      const result = await KYCAPI.updateByToken(token, updateData);
      const kycData = result.kyc || result;
      const leadDataResponse = result.lead || lead;

      setKYC(kycData);
      setFormData(kycData);
      setLead(leadDataResponse);
      setLeadData(leadDataResponse);
      setSuccess("Information saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save information");
    } finally {
      setSaving(false);
    }
  }

  function isFieldEmpty(value) {
    return !value || value === "" || value === "—";
  }

  function FieldDisplay({ label, value, field, type = "text", required = false, dataSource = "kyc" }) {
    const currentValue = dataSource === "lead" ? (leadData[field] !== undefined ? leadData[field] : value) : (formData[field] !== undefined ? formData[field] : value);
    const originalIsEmpty = isFieldEmpty(value);
    if (originalIsEmpty) {
      return (
        <div className="field">
          <label>
            {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
          </label>
          <input
            type={type}
            value={currentValue || ""}
            onChange={(e) => updateField(field, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            style={{
              backgroundColor: "#f0fdf4",
              borderColor: "var(--green)",
            }}
          />
        </div>
      );
    }
    return (
      <div className="field">
        <label style={{ color: "var(--text-muted)" }}>{label} (Filled)</label>
        <div
          style={{
            padding: "8px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            minHeight: 36,
            display: "flex",
            alignItems: "center",
          }}
        >
          {currentValue}
        </div>
      </div>
    );
  }

  function TextAreaDisplay({ label, value, field, required = false }) {
    const isEmpty = isFieldEmpty(value);
    if (isEmpty) {
      return (
        <div className="field">
          <label>
            {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
          </label>
          <textarea
            value={formData[field] || ""}
            onChange={(e) => updateField(field, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            rows="3"
            style={{
              backgroundColor: "#f0fdf4",
              borderColor: "var(--green)",
            }}
          />
        </div>
      );
    }
    return (
      <div className="field">
        <label style={{ color: "var(--text-muted)" }}>{label} (Filled)</label>
        <div
          style={{
            padding: "8px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            minHeight: 60,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {value}
        </div>
      </div>
    );
  }

  function SelectDisplay({ label, value, field, options, required = false, dataSource = "kyc" }) {
    const currentValue = dataSource === "lead" ? (leadData[field] !== undefined ? leadData[field] : value) : (formData[field] !== undefined ? formData[field] : value);
    const originalIsEmpty = isFieldEmpty(value);
    if (originalIsEmpty) {
      return (
        <div className="field">
          <label>
            {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
          </label>
          <select
            value={currentValue || ""}
            onChange={(e) => updateField(field, e.target.value)}
            style={{
              backgroundColor: "#f0fdf4",
              borderColor: "var(--green)",
            }}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    const selectedLabel = options.find((o) => o.value === value)?.label || value;
    return (
      <div className="field">
        <label style={{ color: "var(--text-muted)" }}>{label} (Filled)</label>
        <div
          style={{
            padding: "8px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            minHeight: 36,
            display: "flex",
            alignItems: "center",
          }}
        >
          {selectedLabel}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p className="subtle">Loading KYC...</p>
      </div>
    );
  }

  if (error && !hasEntered) {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <h1>KYC Not Available</h1>
        <p style={{ color: "var(--red)", marginBottom: 16 }}>{error}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Go Back
        </button>
      </div>
    );
  }

  if (!hasEntered) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: 20 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h1>Welcome to {lead?.customerName}'s KYC Information</h1>
          <p className="subtle" style={{ marginBottom: 20 }}>
            This is a private KYC form. Please enter your name to continue.
          </p>

          {error && (
            <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>
              {error}
            </div>
          )}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Your Name</label>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Enter your full name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEnter();
              }}
            />
          </div>

          <button className="btn-primary" onClick={handleEnter} style={{ width: "100%" }}>
            Enter KYC
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1>{lead?.customerName}'s KYC Information</h1>
        <p className="subtle">Fill in the missing KYC details and save</p>
      </div>

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

      {/* Lead Information */}
      {lead && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
          <div>
            <h3>Lead Information</h3>
            <FieldDisplay label="Name" value={lead.customerName} field="customerName" required dataSource="lead" />
            <FieldDisplay label="Phone" value={lead.phone} field="phone" required dataSource="lead" />
            <FieldDisplay label="Email" value={lead.email} field="email" type="email" dataSource="lead" />
          </div>
          <div>
            <h3>Employment & Location</h3>
            <SelectDisplay
              label="Employment Type"
              value={leadData.employmentType !== undefined ? leadData.employmentType : (lead.employmentType || "Salaried")}
              field="employmentType"
              options={[
                { value: "Salaried", label: "Salaried" },
                { value: "Self-employed", label: "Self-employed" },
              ]}
              dataSource="lead"
            />
            <FieldDisplay label="Occupation" value={lead.occupation} field="occupation" dataSource="lead" />
            <FieldDisplay label="City" value={lead.city} field="city" dataSource="lead" />
          </div>
        </div>
      )}

      {/* Additional Contact Information */}
      <div style={{ marginBottom: 20 }}>
        <h3>Additional Contact Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldDisplay label="Official Email" value={formData.officialEmail} field="officialEmail" type="email" />
        </div>
      </div>

      {/* Family Information */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <h3>Family Information</h3>
          <SelectDisplay
            label="Marital Status"
            value={formData.maritalStatus}
            field="maritalStatus"
            options={[
              { value: "single", label: "Single" },
              { value: "married", label: "Married" },
              { value: "divorced", label: "Divorced" },
              { value: "widowed", label: "Widowed" },
            ]}
            required
          />
          {formData.maritalStatus === "married" && (
            <FieldDisplay label="Spouse Name" value={formData.spouseName} field="spouseName" />
          )}
          <FieldDisplay label="Mother Name" value={formData.motherName} field="motherName" required />
          <FieldDisplay label="Number of Dependents" value={formData.numberOfDependents} field="numberOfDependents" type="number" />
        </div>

        <div>
          <h3>Work Experience</h3>
          <FieldDisplay label="Work Experience in Current Company" value={formData.workExperienceCurrentCompany} field="workExperienceCurrentCompany" required />
          <FieldDisplay label="Total Work Experience" value={formData.totalWorkExperience} field="totalWorkExperience" required />
          <FieldDisplay label="Years at Current Address" value={formData.yearsAtCurrentAddress} field="yearsAtCurrentAddress" type="number" required />
          <FieldDisplay label="Years in Current City" value={formData.yearsInCurrentCity} field="yearsInCurrentCity" type="number" required />
        </div>
      </div>

      {/* Address Information */}
      <div style={{ marginBottom: 20 }}>
        <h3>Address Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h4>Permanent Address</h4>
            <FieldDisplay label="STD Code & Mobile Number" value={formData.permanentAddressSTDCode} field="permanentAddressSTDCode" required />
            <TextAreaDisplay label="Permanent Address" value={formData.permanentAddress} field="permanentAddress" required />
            <FieldDisplay label="Landmark" value={formData.permanentLandmark} field="permanentLandmark" required />
            <SelectDisplay
              label="Current Address Type"
              value={formData.currentAddressType}
              field="currentAddressType"
              options={[
                { value: "owned", label: "Owned" },
                { value: "rented", label: "Rented" },
              ]}
              required
            />
          </div>

          <div>
            <h4>Current Address</h4>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.sameAsPermament || false}
                  onChange={(e) => updateField("sameAsPermament", e.target.checked)}
                />{" "}
                Same as Permanent Address
              </label>
            </div>
            {!formData.sameAsPermament && (
              <>
                <TextAreaDisplay label="Current Address" value={formData.currentAddress} field="currentAddress" />
                <FieldDisplay label="Landmark" value={formData.currentLandmark} field="currentLandmark" />
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>Company Address</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <TextAreaDisplay label="Company Address" value={formData.companyAddress} field="companyAddress" required />
            <FieldDisplay label="Landmark" value={formData.companyLandmark} field="companyLandmark" />
          </div>
        </div>
      </div>

      {/* References Section */}
      <div style={{ marginBottom: 20 }}>
        <h3>References</h3>

        {/* Add Reference */}
        <div style={{ backgroundColor: "var(--bg)", padding: 12, borderRadius: 4, marginBottom: 16 }}>
          <h4>Add Reference</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={newReference.type} onChange={(e) => setNewReference((p) => ({ ...p, type: e.target.value }))}>
                <option value="relative">Relative</option>
                <option value="friend">Friend</option>
              </select>
            </div>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={newReference.name}
                onChange={(e) => setNewReference((p) => ({ ...p, name: e.target.value }))}
                placeholder="Reference name"
              />
            </div>
            <div className="field">
              <label>Contact</label>
              <input
                type="text"
                value={newReference.contact}
                onChange={(e) => setNewReference((p) => ({ ...p, contact: e.target.value }))}
                placeholder="Phone or email"
              />
            </div>
            <div className="field">
              <label>Relationship / Notes</label>
              <input
                type="text"
                value={newReference.relationship}
                onChange={(e) => setNewReference((p) => ({ ...p, relationship: e.target.value }))}
                placeholder="Relationship"
              />
            </div>
          </div>
          {newReference.type === "relative" && (
            <div className="field">
              <label>Address (Optional)</label>
              <textarea
                rows="2"
                value={newReference.address || ""}
                onChange={(e) => setNewReference((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
          )}
          <button className="btn-primary" onClick={addReference} style={{ marginTop: 8 }}>
            Add Reference
          </button>
        </div>

        {/* References List */}
        <div>
          {references.length === 0 ? (
            <p className="subtle">No references added yet</p>
          ) : (
            references.map((ref) => (
              <div key={ref._id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <strong>{ref.name}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                      {ref.contact} · {ref.type === "relative" ? ref.relationship : "Friend"}
                    </p>
                    {ref.address && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{ref.address}</p>}
                  </div>
                  <button className="btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => removeReference(ref._id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save KYC Information"}
        </button>
      </div>

      {/* Info Footer */}
      <div style={{ backgroundColor: "var(--blue-soft)", padding: 12, borderRadius: 4, fontSize: 12 }}>
        <p style={{ margin: 0 }}>
          You are viewing this form as: <strong>{visitorName}</strong>
        </p>
        <p style={{ margin: "4px 0 0" }}>
          🟢 <strong>Green fields</strong> = Empty, can be filled. ⚪ <strong>Gray fields</strong> = Already filled, read-only.
        </p>
      </div>
    </div>
  );
}
