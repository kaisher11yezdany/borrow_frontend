import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import StageFields, { defaultStageFields } from "../StageFields";
import { LeadsAPI, SettingsAPI } from "../../api/endpoints";
import { STAGES } from "../../constants";

export default function AdvanceStageModal({ lead, onClose }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const next = STAGES[STAGES.indexOf(lead.stage) + 1];
  const [fields, setFields] = useState(() => defaultStageFields(next, lead));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Bank options load asynchronously, so the "first bank" default (matching
  // what the <select> visually shows) can only be seeded once settings arrive.
  useEffect(() => {
    if (next !== "Login Done" || !settings || fields.bankName !== undefined) return;
    const banks = (settings.banksByProduct?.[lead.product] || []).filter((b) => b.active);
    if (banks[0]) setFields((f) => ({ ...f, bankName: banks[0].name }));
  }, [settings, next, lead.product, fields.bankName]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await LeadsAPI.advanceStage(lead._id, fields);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["verification-badge"] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not advance stage");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Move to: {next}</h2>
      <p className="subtle">{lead.customerName} · {lead.product}</p>
      <form onSubmit={onSubmit}>
        <StageFields next={next} lead={lead} fields={fields} setFields={setFields} banksByProduct={settings?.banksByProduct} />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Confirm</button>
        </div>
      </form>
    </Modal>
  );
}
