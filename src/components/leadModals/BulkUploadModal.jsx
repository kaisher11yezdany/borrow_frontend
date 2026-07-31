import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { LeadsAPI, SettingsAPI, TeamAPI } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";

const LEAD_FIELDS = [
  { name: "customerName", label: "Customer Name", required: true },
  { name: "phone", label: "Phone Number", required: true },
  { name: "altPhone", label: "Alternate Phone" },
  { name: "email", label: "Email" },
  { name: "loanAmount", label: "Loan Amount", type: "number" },
  { name: "monthlyIncome", label: "Monthly Income", type: "number" },
  { name: "employmentType", label: "Employment Type" },
  { name: "leadSource", label: "Lead Source" },
  { name: "leadChannel", label: "Lead Channel" },
  { name: "city", label: "City" },
  { name: "notes", label: "Notes" },
  { name: "product", label: "Product" },
];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

export default function BulkUploadModal({ onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const { data: allUsers = [] } = useQuery({ queryKey: ["team-all"], queryFn: TeamAPI.listAll });

  const [step, setStep] = useState("upload"); // "upload", "mapping", "preview", "uploading"
  const [csvData, setCsvData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [defaultProduct, setDefaultProduct] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, failed: [] });

  const activeProducts = (settings?.products || []).filter((p) => p.active);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
          setUploadError("CSV must contain at least one data row");
          return;
        }

        setCsvData({ headers, rows });
        setFieldMapping({});
        setUploadError("");
        setStep("mapping");
      } catch (err) {
        setUploadError("Could not parse CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleMappingChange(csvColumn, leadField) {
    setFieldMapping((prev) => {
      const updated = { ...prev };
      if (leadField === "") {
        delete updated[csvColumn];
      } else {
        updated[csvColumn] = leadField;
      }
      return updated;
    });
  }

  function getMappedData() {
    return csvData.rows.map((row) => {
      const lead = {};
      if (defaultProduct) lead.product = defaultProduct;
      Object.entries(fieldMapping).forEach(([csvCol, leadField]) => {
        const value = row[csvCol];
        if (leadField === "loanAmount" || leadField === "monthlyIncome") {
          lead[leadField] = value ? parseFloat(value) : undefined;
        } else {
          lead[leadField] = value || undefined;
        }
      });
      return lead;
    });
  }

  function validateMapping() {
    const requiredFields = LEAD_FIELDS.filter((f) => f.required).map((f) => f.name);
    const mappedFields = Object.values(fieldMapping);
    const productIsMapped = mappedFields.includes("product");

    for (const field of requiredFields) {
      if (!mappedFields.includes(field)) {
        setUploadError(`Required field missing: ${LEAD_FIELDS.find((f) => f.name === field).label}`);
        return false;
      }
    }

    // Product is required by backend - must be provided via default or CSV mapping
    if (!defaultProduct && !productIsMapped) {
      setUploadError("Please select a Default Product or map a Product column from your CSV");
      return false;
    }

    return true;
  }

  async function handleUpload() {
    if (!validateMapping()) return;

    setStep("uploading");
    const leads = getMappedData();
    const failed = [];
    let completed = 0;

    for (const lead of leads) {
      setUploadProgress({ completed, total: leads.length, failed });
      try {
        await LeadsAPI.create({
          ...lead,
          partnerId: user.id,
          productColor: activeProducts.find((p) => p.name === defaultProduct)?.color || "#3B82F6",
        });
        completed++;
      } catch (err) {
        failed.push({
          row: lead.customerName || "Unknown",
          error: err.response?.data?.error || "Failed to create lead",
        });
      }
    }

    setUploadProgress({ completed, total: leads.length, failed });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  if (step === "upload") {
    return (
      <Modal onClose={onClose}>
        <h2>Bulk Upload Leads</h2>
        <p className="subtle">Upload a CSV file with lead data. First row should be column headers.</p>
        {uploadError && <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 13 }}>{uploadError}</div>}
        <div className="field">
          <label>CSV File</label>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>
        <p className="subtle" style={{ fontSize: 11, marginTop: 12 }}>
          <strong>Example CSV headers:</strong><br />
          Customer Name, Phone, Email, Loan Amount, City, Lead Source
        </p>
      </Modal>
    );
  }

  if (step === "mapping") {
    const unmappedColumns = csvData.headers.filter((h) => !Object.keys(fieldMapping).includes(h));

    return (
      <Modal onClose={onClose} style={{ maxWidth: "600px" }}>
        <h2>Map CSV Columns</h2>
        <p className="subtle">Map each CSV column to a lead field. Required fields are marked with *</p>

        {uploadError && <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 13 }}>{uploadError}</div>}

        <div className="field">
          <label>Product *</label>
          <select value={defaultProduct} onChange={(e) => setDefaultProduct(e.target.value)}>
            <option value="">Select a product OR map Product column from CSV</option>
            {activeProducts.map((p) => (
              <option key={p._id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="subtle" style={{ fontSize: 11, marginTop: 4 }}>Required: Select here or map a Product column in your CSV</p>
        </div>

        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>Column Mappings</h3>
          {csvData.headers.map((header) => (
            <div key={header} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center" }}>
              <div style={{ flex: 1, fontSize: 12 }}>
                <strong>{header}</strong>
              </div>
              <select
                value={fieldMapping[header] || ""}
                onChange={(e) => handleMappingChange(header, e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- Do not import --</option>
                {LEAD_FIELDS.map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-sm" onClick={() => setStep("upload")}>← Back</button>
          <button className="btn-primary" onClick={() => setStep("preview")} style={{ flex: 1 }}>
            Preview & Upload →
          </button>
        </div>
      </Modal>
    );
  }

  if (step === "preview") {
    const leads = getMappedData();
    const requiredFields = LEAD_FIELDS.filter((f) => f.required).map((f) => f.name);
    const mappedFields = Object.values(fieldMapping);
    const productIsMapped = mappedFields.includes("product");
    const hasProduct = defaultProduct || productIsMapped;
    const isValid = requiredFields.every((f) => mappedFields.includes(f)) && hasProduct;

    return (
      <Modal onClose={onClose} style={{ maxWidth: "600px" }}>
        <h2>Preview ({leads.length} leads)</h2>
        <p className="subtle">Review the first few records before uploading.</p>

        {uploadError && <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 13 }}>{uploadError}</div>}
        {!hasProduct && (
          <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 13, backgroundColor: "var(--red-soft)", padding: "10px", borderRadius: "4px" }}>
            Product is required: Select a Default Product or map a Product column and go back to mapping step.
          </div>
        )}

        <div style={{ maxHeight: 300, overflow: "auto", marginBottom: 16 }}>
          <table style={{ fontSize: 11, width: "100%" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, backgroundColor: "var(--bg)" }}>
                {Object.values(fieldMapping).map((field) => (
                  <th key={field} style={{ padding: 4, textAlign: "left" }}>
                    {LEAD_FIELDS.find((f) => f.name === field)?.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {Object.keys(fieldMapping).map((col) => {
                    const field = fieldMapping[col];
                    const value = lead[field];
                    return (
                      <td key={field} style={{ padding: 4 }}>
                        {value !== undefined ? String(value) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leads.length > 5 && <p className="subtle" style={{ fontSize: 11 }}>... and {leads.length - 5} more</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-sm" onClick={() => setStep("mapping")}>← Back</button>
          <button className="btn-primary" onClick={handleUpload} disabled={!isValid} style={{ flex: 1 }}>
            Upload All →
          </button>
        </div>
      </Modal>
    );
  }

  if (step === "uploading") {
    const percentage = Math.round((uploadProgress.completed / uploadProgress.total) * 100);

    return (
      <Modal onClose={onClose} style={{ maxWidth: "500px" }}>
        <h2>Uploading...</h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>
              {uploadProgress.completed} of {uploadProgress.total}
            </span>
            <span>{percentage}%</span>
          </div>
          <div style={{ backgroundColor: "var(--bg)", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div
              style={{
                backgroundColor: "var(--green)",
                height: "100%",
                width: `${percentage}%`,
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>

        {uploadProgress.failed.length > 0 && (
          <div style={{ backgroundColor: "var(--red-soft)", borderRadius: 4, padding: 8, marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--red)" }}>Failed ({uploadProgress.failed.length})</p>
            {uploadProgress.failed.slice(0, 3).map((fail, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--red)", marginBottom: 2 }}>
                {fail.row}: {fail.error}
              </div>
            ))}
            {uploadProgress.failed.length > 3 && <div style={{ fontSize: 11, color: "var(--red)" }}>... and {uploadProgress.failed.length - 3} more</div>}
          </div>
        )}

        {uploadProgress.completed === uploadProgress.total && (
          <button className="btn-primary" onClick={onClose} style={{ width: "100%" }}>
            Done
          </button>
        )}
      </Modal>
    );
  }
}
