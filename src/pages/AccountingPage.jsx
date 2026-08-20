import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AccountingAPI, TeamAPI } from "../api/endpoints";
import { canManageAccounting, canSeeMargin, inr } from "../constants";
import { installmentsTotal, entryBalance, entryStatusLabel, totalExpensesOf } from "../utils/acct";
import PaymentsModal from "../components/accountingModals/PaymentsModal";
import ExpensesModal from "../components/accountingModals/ExpensesModal";
import LeadDetailsModal from "../components/accountingModals/LeadDetailsModal";
import { useLeadRealtime } from "../hooks/useLeadRealtime";

function AcctCell({ lead, field, entry, editable, doneLabel, onManage }) {
  const total = installmentsTotal(entry);
  const balance = entryBalance(entry);
  const status = entryStatusLabel(entry, doneLabel);
  const cls = status === doneLabel ? "green" : status.startsWith("Partially") || status === "Invoice Sent" ? "amber" : "gray";
  return (
    <>
      <div><span className={`badge ${cls}`}>{status}</span></div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Expected: <span className="num">{inr(entry.expectedAmount)}</span></div>
      <div style={{ fontSize: 12 }}>{doneLabel}: <span className="num">{inr(total)}</span></div>
      <div style={{ fontSize: 12, color: balance > 0 ? "var(--amber)" : undefined }}>Balance: <span className="num">{inr(Math.max(0, balance))}</span></div>
      <button className="btn-sm btn-ghost" onClick={onManage}>{editable ? "Manage" : "View"}</button>
    </>
  );
}

const PAGE_SIZES = [10, 20, 50, 100];

const STAGES = ["Lead Added", "Lead Contacted", "Login Done", "Sanction Done", "Disbursement Done"];

export default function AccountingPage() {
  const { user } = useAuth();
  useLeadRealtime();

  // Check if user has permission to view accounting
  if (!canManageAccounting(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const seeMargin = canSeeMargin(user);
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("All");
  const [sourcedBy, setSourcedBy] = useState("Anyone");
  const [stage, setStage] = useState("Any stage");

  const { data, isLoading } = useQuery({
    queryKey: ["accounting", page, limit, search, product, sourcedBy, stage],
    queryFn: () => AccountingAPI.list({ page, limit, search, product: product === "All" ? undefined : product, sourcedBy: sourcedBy === "Anyone" ? undefined : sourcedBy, stage: stage === "Any stage" ? undefined : stage })
  });
  const { data: allUsers = [] } = useQuery({ queryKey: ["team-all"], queryFn: TeamAPI.listAll });
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const partnerName = (id) => allUsers.find((u) => u._id === id)?.name || "—";

  if (isLoading) return <p className="subtle">Loading…</p>;

  if (!seeMargin) {
    return (
      <>
        <h1>Accounting</h1>
        <p className="subtle">Your payout status per lead. Other financial details (bank commission, service fee, manager compensation) aren't shown at your role.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div className="field">
            <label>Search (name or phone)</label>
            <input placeholder="e.g. Rajesh or 9876543210..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="field">
            <label>Stage</label>
            <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
              <option value="Any stage">Any stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table>
            <thead><tr><th>Customer</th><th>Product</th><th>Stage</th><th>Your payout</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="empty-row"><td colSpan={4}>No leads yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.lead._id}>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => setModal({ type: "details", lead: r.lead })}
                        style={{ textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", color: "var(--blue)", textDecoration: "underline" }}
                      >
                        {r.lead.customerName}
                      </button>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: r.lead.productColor || "#3B82F6",
                          color: "white",
                        }}
                      >
                        {r.lead.product}
                      </span>
                    </td>
                    <td><span className="badge gray">{r.lead.stage}</span></td>
                    <td>
                      <AcctCell
                        lead={r.lead}
                        field="payable"
                        entry={r.payable}
                        editable={r.editable}
                        doneLabel="Paid"
                        onManage={() => setModal({ type: "payments", lead: r.lead, field: "payable", editable: r.editable })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            <span className="subtle" style={{ margin: 0, fontSize: 12 }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select style={{ width: "auto" }} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
              <span className="subtle" style={{ margin: 0, fontSize: 12 }}>Page {page} of {totalPages}</span>
              <button className="btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
            </div>
          </div>
        )}
        {modal?.type === "payments" && (
          <PaymentsModal lead={modal.lead} field={modal.field} editable={modal.editable} onClose={() => setModal(null)} />
        )}
        {modal?.type === "details" && (
          <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)} />
        )}
      </>
    );
  }

  return (
    <>
      <h1>Accounting</h1>
      <p className="subtle">
        Receivable = the commission the bank owes us for this loan. Service Fee = a separate charge billed directly to the
        customer. Payable = the payout owed to whoever sourced the lead — this can include money paid out early, before we've
        actually received the matching amount back. Manager Bonus is a separate payment to the overseeing Manager. Any of
        these can be paid or received in parts — click Manage to log a payment and see what's left as the balance.
      </p>
      <div className="help-note">
        Accounting stays view-only until a lead fully clears final verification after disbursement (i.e. shows Completed).
        This applies even to draft/submitted disbursements still awaiting the final check.
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>Filters</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div className="field">
            <label>Search (name or phone)</label>
            <input placeholder="e.g. Rajesh or 9876543210..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="field">
            <label>Product</label>
            <select value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }}>
              <option value="All">All products</option>
              {[...new Set(rows.map((r) => r.lead.product))].sort().map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Sourced by</label>
            <select value={sourcedBy} onChange={(e) => { setSourcedBy(e.target.value); setPage(1); }}>
              <option value="Anyone">Anyone</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stage</label>
            <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
              <option value="Any stage">Any stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Customer</th><th>Product</th><th>Stage</th><th>Disbursed</th><th>Receivable (bank commission)</th>
              <th>Service Fee</th><th>Payable (partner payout)</th><th>Manager Bonus</th><th>Expenses</th>
              <th>Gross Revenue</th><th>Net Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="empty-row"><td colSpan={11}>No leads yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.lead._id}>
                  <td>
                    <button
                      className="btn-link"
                      onClick={() => setModal({ type: "details", lead: r.lead })}
                      style={{ textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", color: "var(--blue)", textDecoration: "underline", fontSize: "inherit", fontWeight: "inherit" }}
                    >
                      {r.lead.customerName}
                    </button>
                    <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
                      Sourced by {partnerName(r.lead.partnerId)}
                      {r.lead.dsaCode ? ` · DSA ${r.lead.dsaCode}` : ""}
                      {r.lead.appId ? ` · App ${r.lead.appId}` : ""}
                    </div>
                    {r.lead.finalVerification.status !== "verified" && (
                      <div className="subtle" style={{ fontSize: 11, color: "var(--amber)" }}>Not yet fully verified — accounting locked</div>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: r.lead.productColor || "#3B82F6",
                        color: "white",
                      }}
                    >
                      {r.lead.product}
                    </span>
                  </td>
                  <td><span className="badge gray">{r.lead.stage}</span></td>
                  <td className="num">{inr(r.lead.disbursement.amount)}</td>
                  <td>
                    <AcctCell lead={r.lead} field="receivable" entry={r.receivable} editable={r.editable} doneLabel="Received"
                      onManage={() => setModal({ type: "payments", lead: r.lead, field: "receivable", editable: r.editable })} />
                  </td>
                  <td>
                    <AcctCell lead={r.lead} field="serviceFee" entry={r.serviceFee} editable={r.editable} doneLabel="Received"
                      onManage={() => setModal({ type: "payments", lead: r.lead, field: "serviceFee", editable: r.editable })} />
                  </td>
                  <td>
                    <AcctCell lead={r.lead} field="payable" entry={r.payable} editable={r.editable} doneLabel="Paid"
                      onManage={() => setModal({ type: "payments", lead: r.lead, field: "payable", editable: r.editable })} />
                  </td>
                  <td>
                    <AcctCell lead={r.lead} field="managerComp" entry={r.managerComp} editable={r.editable} doneLabel="Paid"
                      onManage={() => setModal({ type: "payments", lead: r.lead, field: "managerComp", editable: r.editable })} />
                  </td>
                  <td>
                    <div className="num">{inr(totalExpensesOf(r.expenses))}</div>
                    {(r.expenses || []).map((e) => (
                      <div key={e._id} className="subtle" style={{ fontSize: 11, margin: "2px 0" }}>
                        {e.type}: <span className="num">{inr(e.amount)}</span>
                      </div>
                    ))}
                    {r.editable && (
                      <button className="btn-sm btn-ghost" onClick={() => setModal({ type: "expenses", lead: r.lead, editable: r.editable })}>Manage</button>
                    )}
                  </td>
                  <td className="num" style={{ color: "var(--gold)" }}>{inr(r.grossRevenue)}</td>
                  <td className="num" style={{ color: "var(--green)" }}>{inr(r.netRevenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          <span className="subtle" style={{ margin: 0, fontSize: 12 }}>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select style={{ width: "auto" }} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button className="btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
            <span className="subtle" style={{ margin: 0, fontSize: 12 }}>Page {page} of {totalPages}</span>
            <button className="btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
          </div>
        </div>
      )}

      {modal?.type === "payments" && (
        <PaymentsModal lead={modal.lead} field={modal.field} editable={modal.editable} onClose={() => setModal(null)} />
      )}
      {modal?.type === "expenses" && (
        <ExpensesModal lead={modal.lead} editable={modal.editable} onClose={() => setModal(null)} />
      )}
      {modal?.type === "details" && (
        <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)} />
      )}
    </>
  );
}
