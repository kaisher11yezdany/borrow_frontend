import { useEffect, useState, useRef } from "react";
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
  const [originalValues, setOriginalValues] = useState({});
  const [references, setReferences] = useState([]);
  const [newReference, setNewReference] = useState({ name: "", contact: "", relationship: "", type: "relative", address: "" });
  const [saving, setSaving] = useState(false);
  const [sameAsPermament, setSameAsPermament] = useState(formData.sameAsPermament || false);
  const formRefs = useRef({});

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
      const mergedForm = { ...leadDataResponse, ...kycData };
      setFormData(mergedForm);
      setSameAsPermament(mergedForm.sameAsPermament || false);
      setOriginalValues(kycData);
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

  function handleSameAsPermament(checked) {
    setSameAsPermament(checked);
    if (checked) {
      const permanentAddr = formRefs.current.permanentAddress?.value || "";
      const permanentLandmark = formRefs.current.permanentLandmark?.value || "";

      if (formRefs.current.currentAddress) {
        formRefs.current.currentAddress.value = permanentAddr;
      }
      if (formRefs.current.currentLandmark) {
        formRefs.current.currentLandmark.value = permanentLandmark;
      }
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const leadFields = ["customerName", "phone", "email", "employmentType", "occupation", "city"];
      const leadUpdates = {};
      const kycUpdates = {};

      Object.keys(formRefs.current).forEach((key) => {
        const ref = formRefs.current[key];
        if (!ref) return;

        const value = ref.type === "checkbox" ? ref.checked : ref.value;
        if (leadFields.includes(key)) {
          leadUpdates[key] = value;
        } else {
          kycUpdates[key] = value;
        }
      });

      // If "Same as Permanent Address" is checked, copy permanent values to current
      if (sameAsPermament) {
        kycUpdates.currentAddress = formRefs.current.permanentAddress?.value || "";
        kycUpdates.currentLandmark = formRefs.current.permanentLandmark?.value || "";
      }

      // Always include sameAsPermament flag
      kycUpdates.sameAsPermament = sameAsPermament;

      const updateData = {
        ...kycUpdates,
        leadUpdates
      };

      const result = await KYCAPI.updateByToken(token, updateData);
      const kycData = result.kyc || result;
      const leadDataResponse = result.lead || lead;

      setKYC(kycData);
      setLead(leadDataResponse);
      const mergedForm = { ...leadDataResponse, ...kycData };
      setFormData(mergedForm);
      setSameAsPermament(mergedForm.sameAsPermament || false);
      setOriginalValues(kycData);
      setSuccess("Information saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save information");
    } finally {
      setSaving(false);
    }
  }

  function FormField({ label, field, type = "text", required = false }) {
    const defaultValue = formData[field] || "";
    const isDisabled = defaultValue !== "";
    return (
      <div className="field">
        <label>{label} {required && <span style={{ color: "var(--red)" }}>*</span>}</label>
        <input
          type={type}
          defaultValue={defaultValue}
          ref={(el) => { if (el) formRefs.current[field] = el; }}
          placeholder={`Enter ${label.toLowerCase()}`}
          disabled={isDisabled}
        />
      </div>
    );
  }

  function FormTextArea({ label, field, required = false }) {
    const defaultValue = formData[field] || "";
    const isDisabled = defaultValue !== "";
    return (
      <div className="field">
        <label>{label} {required && <span style={{ color: "var(--red)" }}>*</span>}</label>
        <textarea
          defaultValue={defaultValue}
          ref={(el) => { if (el) formRefs.current[field] = el; }}
          placeholder={`Enter ${label.toLowerCase()}`}
          rows="3"
          disabled={isDisabled}
        />
      </div>
    );
  }

  function FormSelect({ label, field, options, required = false }) {
    const defaultValue = formData[field] || "";
    const isDisabled = defaultValue !== "";
    return (
      <div className="field">
        <label>{label} {required && <span style={{ color: "var(--red)" }}>*</span>}</label>
        <select defaultValue={defaultValue} ref={(el) => { if (el) formRefs.current[field] = el; }} disabled={isDisabled}>
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
            <FormField label="Name" field="customerName" required />
            <FormField label="Phone" field="phone" required />
            <FormField label="Email" field="email" type="email" />
          </div>
          <div>
            <h3>Employment & Location</h3>
            <FormSelect
              label="Employment Type"
              field="employmentType"
              options={[
                { value: "Salaried", label: "Salaried" },
                { value: "Self-employed", label: "Self-employed" },
              ]}
            />
            <FormField label="Occupation" field="occupation" />
            <FormField label="City" field="city" />
          </div>
        </div>
      )}

      {/* Additional Contact Information */}
      <div style={{ marginBottom: 20 }}>
        <h3>Additional Contact Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField label="Official Email" field="officialEmail" type="email" />
        </div>
      </div>

      {/* Family Information */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <h3>Family Information</h3>
          <FormSelect
            label="Marital Status"
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
            <FormField label="Spouse Name" field="spouseName" />
          )}
          <FormField label="Mother Name" field="motherName" required />
          <FormField label="Number of Dependents" field="numberOfDependents" type="number" />
        </div>

        <div>
          <h3>Work Experience</h3>
          <FormField label="Work Experience in Current Company" field="workExperienceCurrentCompany" required />
          <FormField label="Total Work Experience" field="totalWorkExperience" required />
          <FormField label="Years at Current Address" field="yearsAtCurrentAddress" type="number" required />
          <FormField label="Years in Current City" field="yearsInCurrentCity" type="number" required />
        </div>
      </div>

      {/* Address Information */}
      <div style={{ marginBottom: 20 }}>
        <h3>Address Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h4>Permanent Address</h4>
            <FormField label="STD Code & Mobile Number" field="permanentAddressSTDCode" required />
            <FormTextArea label="Permanent Address" field="permanentAddress" required />
            <FormField label="Landmark" field="permanentLandmark" required />
            <FormSelect
              label="Current Address Type"
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
                  checked={sameAsPermament}
                  onChange={(e) => handleSameAsPermament(e.target.checked)}
                />{" "}
                Same as Permanent Address
              </label>
            </div>
            {!sameAsPermament && (
              <>
                <FormTextArea label="Current Address" field="currentAddress" />
                <FormField label="Landmark" field="currentLandmark" />
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>Company Address</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormTextArea label="Company Address" field="companyAddress" required />
            <FormField label="Landmark" field="companyLandmark" />
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
