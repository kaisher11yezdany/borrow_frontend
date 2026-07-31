import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../Modal";
import { ExpensesAPI, SettingsAPI } from "../../api/endpoints";
import { inr, fmtDate } from "../../constants";

export default function ExpensesModal({ lead, editable, onClose }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["expenses", lead._id],
    queryFn: () => ExpensesAPI.list(lead._id),
  });
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const types = (settings?.expenseTypes || []).filter((t) => t.active);
  const accounts = (settings?.companyBankAccounts || []).filter((a) => a.active);

  function invalidateOutside() {
    qc.invalidateQueries({ queryKey: ["accounting"] });
  }

  async function addExpense(e) {
    e.preventDefault();
    if (!type) return;
    await ExpensesAPI.add(lead._id, { type, amount: Number(amount) || 0, bankAccount, date });
    setAmount("");
    refetch();
    invalidateOutside();
  }
  async function remove(id) {
    await ExpensesAPI.remove(id);
    refetch();
    invalidateOutside();
  }

  return (
    <Modal onClose={onClose}>
      <h2>Expenses — {lead.customerName}</h2>
      <table>
        <thead><tr><th>Type</th><th>Amount</th><th>Paid from</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr className="empty-row"><td colSpan={5}>No expenses recorded.</td></tr>
          ) : (
            expenses.map((e) => (
              <tr key={e._id}>
                <td>{e.type}</td>
                <td className="num">{inr(e.amount)}</td>
                <td>{e.bankAccount || "—"}</td>
                <td>{fmtDate(e.date)}</td>
                <td>{editable && <button className="btn-sm btn-ghost" onClick={() => remove(e._id)}>Remove</button>}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {editable && (
        <form onSubmit={addExpense} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Select...</option>
              {types.map((t) => <option key={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 110 }}>
            <label>Amount</label>
            <input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 130 }}>
            <label>Paid from</label>
            <select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
              <option value="">Select...</option>
              {accounts.map((a) => <option key={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 140 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      )}
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
