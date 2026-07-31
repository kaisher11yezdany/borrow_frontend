import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { RemindersAPI } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { canUpdateStage, fmtDate } from "../constants";

function isOverdue(r) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return r.status === "pending" && new Date(r.date) < today;
}

export default function RemindersModal({ lead, onClose }) {
  const { user } = useAuth();
  const editable = canUpdateStage(user);
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [caseDetails, setCaseDetails] = useState("");

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", lead._id],
    queryFn: () => RemindersAPI.listForLead(lead._id),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["reminders", lead._id] });
    qc.invalidateQueries({ queryKey: ["reminder-badge"] });
    qc.invalidateQueries({ queryKey: ["reminders-board"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!date || !caseDetails.trim()) return;
    await RemindersAPI.add(lead._id, { date, caseDetails: caseDetails.trim() });
    setDate("");
    setCaseDetails("");
    invalidate();
  }
  async function markDone(id) {
    await RemindersAPI.markDone(id);
    invalidate();
  }
  async function markPending(id) {
    await RemindersAPI.markPending(id);
    invalidate();
  }
  async function remove(id) {
    await RemindersAPI.remove(id);
    invalidate();
  }

  const sorted = reminders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <Modal wide onClose={onClose}>
      <h2>Reminders — {lead.customerName}</h2>
      <p className="subtle">
        Use case details to note *why* this customer is worth following up — e.g. "On a high-interest home loan, may want to
        switch banks" or "Took a car loan, no home loan yet — check interest."
      </p>
      <table>
        <thead>
          <tr>
            <th>Reminder date</th>
            <th>Case details</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={4}>No reminders set yet.</td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r._id}>
                <td>
                  {fmtDate(r.date)} {isOverdue(r) && <span className="badge red">Overdue</span>}
                </td>
                <td style={{ fontSize: 13 }}>{r.caseDetails}</td>
                <td>{r.status === "done" ? <span className="badge green">Done</span> : <span className="badge amber">Pending</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {editable && r.status === "pending" && (
                    <button className="btn-sm btn-approve" onClick={() => markDone(r._id)}>Mark done</button>
                  )}
                  {editable && r.status === "done" && (
                    <button className="btn-sm btn-ghost" onClick={() => markPending(r._id)}>Reopen</button>
                  )}
                  {editable && (
                    <button className="btn-sm btn-ghost" onClick={() => remove(r._id)}>Remove</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {editable && (
        <form onSubmit={addReminder} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, width: 150 }}>
            <label>Reminder date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <label>Case details</label>
            <input value={caseDetails} onChange={(e) => setCaseDetails(e.target.value)} required placeholder="Why follow up with this customer?" />
          </div>
          <button type="submit" className="btn-primary">Add reminder</button>
        </form>
      )}
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
