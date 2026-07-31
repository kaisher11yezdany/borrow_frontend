import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { AccountingAPI, SettingsAPI } from "../../api/endpoints";
import { inr, fmtDate } from "../../constants";
import { installmentsTotal, entryBalance } from "../../utils/acct";

const FIELD_LABELS = {
  receivable: { title: "Receivable (bank commission)", done: "Received", account: "Received into", hasRate: true, isOutgoing: false },
  payable: { title: "Payable (partner payout)", done: "Paid", account: "Paid from", hasRate: true, isOutgoing: true },
  managerComp: { title: "Manager Bonus", done: "Paid", account: "Paid from", hasRate: false, isOutgoing: true },
  serviceFee: { title: "Service Fee", done: "Received", account: "Received into", hasRate: false, isOutgoing: false },
};

export default function PaymentsModal({ lead, field, editable, onClose }) {
  const qc = useQueryClient();
  const cfg = FIELD_LABELS[field];
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const { data, refetch } = useQuery({
    queryKey: ["accounting-entry", lead._id, field],
    queryFn: () => AccountingAPI.getEntry(lead._id, field),
  });
  const entry = data?.entry;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankAccount, setBankAccount] = useState("");
  const [note, setNote] = useState("");
  const [isAdvance, setIsAdvance] = useState(false);
  const [expectedMode, setExpectedMode] = useState(field === "serviceFee" || field === "receivable" ? "percentage" : "manual");
  const [expectedPercent, setExpectedPercent] = useState(0);
  const [expectedAmount, setExpectedAmount] = useState(0);

  const accounts = (settings?.companyBankAccounts || []).filter((a) => a.active);

  function invalidateOutside() {
    qc.invalidateQueries({ queryKey: ["accounting"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function setRate(val) {
    await AccountingAPI.setRate(lead._id, field, Number(val) || 0);
    refetch();
    invalidateOutside();
  }
  async function setExpected(val) {
    await AccountingAPI.setExpected(lead._id, field, Number(val) || 0);
    refetch();
    invalidateOutside();
  }
  async function setInvoiceRaised(val) {
    await AccountingAPI.setInvoiceRaised(lead._id, field, val);
    refetch();
    invalidateOutside();
  }
  async function addInstallment(e) {
    e.preventDefault();
    if (!amount) return;
    await AccountingAPI.addInstallment(lead._id, field, { amount: Number(amount), date, bankAccount, note, isAdvance });
    setAmount("");
    setNote("");
    setIsAdvance(false);
    refetch();
    invalidateOutside();
  }
  async function removeInstallment(idx) {
    await AccountingAPI.removeInstallment(lead._id, field, idx);
    refetch();
    invalidateOutside();
  }
  async function reconcile(idx) {
    await AccountingAPI.reconcileInstallment(lead._id, field, idx);
    refetch();
    invalidateOutside();
  }

  if (!entry) return null;

  const total = installmentsTotal(entry);
  const balance = entryBalance(entry);

  return (
    <Modal wide onClose={onClose}>
      <h2>{cfg.title} — {lead.customerName}</h2>
      <p className="subtle">
        {!editable
          ? "Log each payment separately — the status and balance below update automatically."
          : "Log each payment separately — the status and balance below update automatically."}
      </p>
      {editable ? (
        <>
          <div className="row" style={{ marginBottom: 14 }}>
            {cfg.hasRate && (
              <div className="field" style={{ minWidth: 100 }}>
                <label>Rate %</label>
                <input
                  key={`rate-${entry.updatedAt}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={entry.ratePct || 0}
                  onBlur={(e) => setRate(e.target.value)}
                />
              </div>
            )}
            <div className="field" style={{ minWidth: 140 }}>
              <label>Expected amount (₹)</label>
              {field === "serviceFee" ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 400, width: "auto" }}>
                      <input
                        type="radio"
                        value="percentage"
                        checked={expectedMode === "percentage"}
                        onChange={(e) => setExpectedMode(e.target.value)}
                      />
                      % of loan
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 400, width: "auto" }}>
                      <input
                        type="radio"
                        value="manual"
                        checked={expectedMode === "manual"}
                        onChange={(e) => setExpectedMode(e.target.value)}
                      />
                      Manual
                    </label>
                  </div>
                  {expectedMode === "percentage" ? (
                    <input
                      key={`expected-${entry.updatedAt}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 2 for 2%"
                      defaultValue={entry.expectedAmount || 0}
                      onBlur={(e) => {
                        const percent = Number(e.target.value) || 0;
                        const baseAmount = lead.loanAmount || 0;
                        const calculatedAmount = (baseAmount * percent) / 100;
                        setExpected(calculatedAmount);
                      }}
                    />
                  ) : (
                    <input
                      key={`expected-${entry.updatedAt}`}
                      type="number"
                      min="0"
                      placeholder="Enter amount directly"
                      defaultValue={entry.expectedAmount || 0}
                      onBlur={(e) => setExpected(e.target.value)}
                    />
                  )}
                </>
              ) : (
                <input
                  key={`expected-${entry.updatedAt}`}
                  type="number"
                  min="0"
                  defaultValue={entry.expectedAmount || 0}
                  onBlur={(e) => setExpected(e.target.value)}
                />
              )}
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, width: "auto", marginBottom: 14 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={!!entry.invoiceRaised}
              disabled={total > 0}
              onChange={(e) => setInvoiceRaised(e.target.checked)}
            />
            Invoice sent (no payment logged yet)
          </label>
        </>
      ) : (
        <p className="subtle">Expected: {inr(entry.expectedAmount)}</p>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">{cfg.done} so far</div>
          <div className="stat-value" style={{ fontSize: 17 }}>{inr(total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ fontSize: 17, color: balance > 0 ? "var(--amber)" : undefined }}>{inr(Math.max(0, balance))}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Amount</th><th>{cfg.account}</th><th>Note</th>
            {cfg.isOutgoing && <th>Paid early?</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(entry.installments || []).length === 0 ? (
            <tr className="empty-row"><td colSpan={cfg.isOutgoing ? 6 : 5}>No payments logged yet.</td></tr>
          ) : (
            entry.installments.map((ins, i) => (
              <tr key={i}>
                <td>{fmtDate(ins.date)}</td>
                <td className="num">{inr(ins.amount)}</td>
                <td>{ins.bankAccount || "—"}</td>
                <td style={{ fontSize: 12 }}>{ins.note || ""}</td>
                {cfg.isOutgoing && (
                  <td>
                    {ins.isAdvance ? (
                      ins.reconciled ? (
                        <span className="badge green">Paid early · now settled</span>
                      ) : (
                        <>
                          <span className="badge amber">Paid early · not settled yet</span>{" "}
                          {editable && <button className="btn-sm btn-ghost" onClick={() => reconcile(i)}>Mark as settled</button>}
                        </>
                      )
                    ) : (
                      <span className="subtle" style={{ fontSize: 11 }}>—</span>
                    )}
                  </td>
                )}
                <td>{editable && <button className="btn-sm btn-ghost" onClick={() => removeInstallment(i)}>Remove</button>}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {editable && (
        <form onSubmit={addInstallment} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, width: 120 }}>
            <label>Amount</label>
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 140 }}>
            <label>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
            <label>{cfg.account}</label>
            <select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
              <option value="">Select...</option>
              {accounts.map((a) => <option key={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {cfg.isOutgoing && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, width: "auto" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} />
              This is paid early (before we've received the matching money back)
            </label>
          )}
          <button type="submit" className="btn-primary">Add payment</button>
        </form>
      )}
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
