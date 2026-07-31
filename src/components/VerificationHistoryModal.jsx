import Modal from "./Modal";
import { fmtDateTime, verificationStatusInfo } from "../constants";

export default function VerificationHistoryModal({ lead, allUsers, onClose }) {
  const events = [
    ...(lead.verification.history || []).map((h) => ({ ...h, stage: "Initial verification" })),
    ...(lead.finalVerification.history || []).map((h) => ({ ...h, stage: "Final verification" })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  function byName(id) {
    if (!id) return "—";
    return allUsers.find((u) => u._id === id)?.name || "—";
  }

  return (
    <Modal wide onClose={onClose}>
      <h2>Verification history — {lead.customerName}</h2>
      <p className="subtle">Every approve/reject decision on this lead, newest first, with who made it and their reason.</p>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Stage</th>
            <th>Status</th>
            <th>By</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={5}>No verification activity yet.</td>
            </tr>
          ) : (
            events.map((e, i) => {
              const info = verificationStatusInfo(e.status);
              return (
                <tr key={i}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(e.at)}</td>
                  <td style={{ fontSize: 12 }}>{e.stage}</td>
                  <td><span className={`badge ${info.cls}`}>{info.label}</span></td>
                  <td style={{ fontSize: 13 }}>{byName(e.by)}</td>
                  <td style={{ fontSize: 13 }}>{e.note ? `"${e.note}"` : <span className="subtle">—</span>}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
