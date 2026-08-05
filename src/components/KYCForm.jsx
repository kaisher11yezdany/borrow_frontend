import { useState, useEffect } from "react";
import { KYCAPI } from "../api/endpoints";

export default function KYCForm({ lead, onSave }) {
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState([]);
  const [newReference, setNewReference] = useState({ name: "", contact: "", relationship: "", type: "relative" });
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
      setKyc(kycData);
      setReferences(kycData.references || []);
    } catch (err) {
      console.error("Failed to load KYC:", err);
      setKyc({
        leadId: lead._id,
        references: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setKyc((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    try {
      setError("");
      setSuccess("");
      const result = await KYCAPI.update(lead._id, kyc);
      const kycData = result.kyc || result;
      setKyc(kycData);
      setSuccess("KYC information saved successfully");
      onSave?.();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save KYC");
    }
  }

  async function addReference() {
    if (!newReference.name || !newReference.contact) {
      setError("Name and contact are required for references");
      return;
    }
    try {
      const result = await KYCAPI.addReference(lead._id, newReference);
      const kycData = result.kyc || result;
      setReferences(kycData.references || []);
      setNewReference({ name: "", contact: "", relationship: "", type: "relative" });
      setSuccess("Reference added");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add reference");
    }
  }

  async function removeReference(refId) {
    try {
      const result = await KYCAPI.removeReference(lead._id, refId);
      const kycData = result.kyc || result;
      setReferences(kycData.references || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove reference");
    }
  }

  if (loading) return <p className="subtle">Loading KYC information...</p>;

  return (
    <div style={{ maxWidth: "1000px" }}>
      {error && <div style={{ color: "var(--red)", marginBottom: 12, padding: "10px", backgroundColor: "var(--red-soft)", borderRadius: "4px" }}>{error}</div>}
      {success && <div style={{ color: "var(--green)", marginBottom: 12, padding: "10px", backgroundColor: "var(--green-soft)", borderRadius: "4px" }}>{success}</div>}

      {/* Lead Information (From Lead model) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, padding: 12, backgroundColor: "var(--bg)", borderRadius: 4 }}>
        <div>
          <h3>Lead Information</h3>
          <div className="field">
            <label>Name</label>
            <input type="text" value={lead.customerName} disabled />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="text" value={lead.phone} disabled />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={lead.email || ""} disabled />
          </div>
        </div>
        <div>
          <h3>Employment & Location</h3>
          <div className="field">
            <label>Employment Type</label>
            <input type="text" value={lead.employmentType || "Salaried"} disabled />
          </div>
          <div className="field">
            <label>Occupation</label>
            <input type="text" value={lead.occupation || ""} disabled />
          </div>
          <div className="field">
            <label>City</label>
            <input type="text" value={lead.city || ""} disabled />
          </div>
        </div>
      </div>

      {/* KYC Extended Information */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Personal Information */}
        <div>
          <h3>Additional Contact</h3>
          <div className="field">
            <label>Official Email</label>
            <input
              type="email"
              value={kyc.officialEmail || ""}
              onChange={(e) => updateField("officialEmail", e.target.value)}
            />
          </div>
        </div>

        {/* Family Information */}
        <div>
          <h3>Family Information</h3>
          <div className="field">
            <label>Marital Status *</label>
            <select value={kyc.maritalStatus || ""} onChange={(e) => updateField("maritalStatus", e.target.value)} required>
              <option value="">Select...</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          {kyc.maritalStatus === "married" && (
            <div className="field">
              <label>Spouse Name</label>
              <input
                type="text"
                value={kyc.spouseName || ""}
                onChange={(e) => updateField("spouseName", e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Mother Name *</label>
            <input
              type="text"
              value={kyc.motherName || ""}
              onChange={(e) => updateField("motherName", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Number of Dependents (Optional)</label>
            <input
              type="number"
              min="0"
              value={kyc.numberOfDependents || ""}
              onChange={(e) => updateField("numberOfDependents", parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Work Experience */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <div>
          <h3>Work Experience</h3>
          <div className="field">
            <label>Work Experience in Current Company *</label>
            <input
              type="text"
              placeholder="e.g., 3 years 6 months"
              value={kyc.workExperienceCurrentCompany || ""}
              onChange={(e) => updateField("workExperienceCurrentCompany", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Total Work Experience *</label>
            <input
              type="text"
              placeholder="e.g., 8 years"
              value={kyc.totalWorkExperience || ""}
              onChange={(e) => updateField("totalWorkExperience", e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <h3>Address Timeline</h3>
          <div className="field">
            <label>Years at Current Address *</label>
            <input
              type="number"
              min="0"
              value={kyc.yearsAtCurrentAddress || ""}
              onChange={(e) => updateField("yearsAtCurrentAddress", parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div className="field">
            <label>Years in Current City *</label>
            <input
              type="number"
              min="0"
              value={kyc.yearsInCurrentCity || ""}
              onChange={(e) => updateField("yearsInCurrentCity", parseInt(e.target.value) || 0)}
              required
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div style={{ marginTop: 20 }}>
        <h3>Address Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Permanent Address */}
          <div>
            <h4>Permanent Address *</h4>
            <div className="field">
              <label>STD Code & Mobile Number *</label>
              <input
                type="text"
                placeholder="e.g., 040-1234567890"
                value={kyc.permanentAddressSTDCode || ""}
                onChange={(e) => updateField("permanentAddressSTDCode", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Permanent Address *</label>
              <textarea
                rows="3"
                value={kyc.permanentAddress || ""}
                onChange={(e) => updateField("permanentAddress", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Landmark *</label>
              <input
                type="text"
                value={kyc.permanentLandmark || ""}
                onChange={(e) => updateField("permanentLandmark", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Current Address Type *</label>
              <select value={kyc.currentAddressType || ""} onChange={(e) => updateField("currentAddressType", e.target.value)} required>
                <option value="">Select...</option>
                <option value="owned">Owned</option>
                <option value="rented">Rented</option>
              </select>
            </div>
          </div>

          {/* Current Address */}
          <div>
            <h4>Current Address</h4>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={kyc.sameAsPermament}
                  onChange={(e) => updateField("sameAsPermament", e.target.checked)}
                />{" "}
                Same as Permanent Address
              </label>
            </div>
            {!kyc.sameAsPermament && (
              <>
                <div className="field">
                  <label>Current Address</label>
                  <textarea
                    rows="3"
                    value={kyc.currentAddress || ""}
                    onChange={(e) => updateField("currentAddress", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Landmark</label>
                  <input
                    type="text"
                    value={kyc.currentLandmark || ""}
                    onChange={(e) => updateField("currentLandmark", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Company Address */}
        <div style={{ marginTop: 16 }}>
          <h4>Company Address</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field">
              <label>Company Address *</label>
              <textarea
                rows="3"
                value={kyc.companyAddress || ""}
                onChange={(e) => updateField("companyAddress", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Landmark</label>
              <input
                type="text"
                value={kyc.companyLandmark || ""}
                onChange={(e) => updateField("companyLandmark", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* References Section */}
      <div style={{ marginTop: 20 }}>
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
      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button className="btn-primary" onClick={handleSave}>
          Save KYC Information
        </button>
      </div>
    </div>
  );
}
