import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { AccountingAPI, SettingsAPI, TeamAPI } from "../api/endpoints";
import { canSeeMargin, inr } from "../constants";
import { installmentsTotal, entryBalance, latestInstallmentDate } from "../utils/acct";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const seeMargin = canSeeMargin(user);
  const [filters, setFilters] = useState({ from: "", to: "", product: "All" });

  const { data: acctData, isLoading } = useQuery({ queryKey: ["accounting"], queryFn: AccountingAPI.list });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: TeamAPI.get });

  const rows = acctData?.rows || [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.product !== "All" && r.lead.product !== filters.product) return false;
      const basis = seeMargin
        ? latestInstallmentDate(r.receivable) || new Date(r.lead.createdAt).getTime()
        : latestInstallmentDate(r.payable) || new Date(r.lead.createdAt).getTime();
      if (filters.from && basis < new Date(filters.from).getTime()) return false;
      if (filters.to && basis > new Date(filters.to).getTime() + 86399999) return false;
      return true;
    });
  }, [rows, filters, seeMargin]);

  const commissionStats = useMemo(() => {
    const disbRows = rows.filter((r) => r.lead.stage === "Disbursement Done");
    const totalCommissionReceivable = disbRows.reduce((s, r) => s + (r.receivable?.expectedAmount || 0) + (r.serviceFee?.expectedAmount || 0), 0);
    const commissionReceived = disbRows.reduce((s, r) => s + installmentsTotal(r.receivable) + installmentsTotal(r.serviceFee), 0);
    const commissionBalance = disbRows.reduce((s, r) => s + Math.max(0, entryBalance(r.receivable)) + Math.max(0, entryBalance(r.serviceFee)), 0);
    return { totalCommissionReceivable, commissionReceived, commissionBalance };
  }, [rows]);

  const stats = useMemo(() => {
    if (seeMargin) {
      const totalReceived = filtered.reduce((s, r) => s + installmentsTotal(r.receivable), 0);
      const totalServiceFee = filtered.reduce((s, r) => s + installmentsTotal(r.serviceFee), 0);
      const totalPaid = filtered.reduce((s, r) => s + installmentsTotal(r.payable), 0);
      const pendingReceivable = filtered.reduce((s, r) => s + Math.max(0, entryBalance(r.receivable)), 0);
      const byProduct = {};
      filtered.forEach((r) => {
        if (!byProduct[r.lead.product]) byProduct[r.lead.product] = { val: 0, count: 0 };
        byProduct[r.lead.product].val += installmentsTotal(r.receivable);
        byProduct[r.lead.product].count += 1;
      });
      return { totalReceived, totalServiceFee, totalPaid, pendingReceivable, byProduct };
    }
    const totalPaid = filtered.reduce((s, r) => s + installmentsTotal(r.payable), 0);
    const pendingPayable = filtered.reduce((s, r) => s + Math.max(0, entryBalance(r.payable)), 0);
    const byProduct = {};
    filtered.forEach((r) => {
      if (!byProduct[r.lead.product]) byProduct[r.lead.product] = { val: 0, count: 0 };
      byProduct[r.lead.product].val += installmentsTotal(r.payable);
      byProduct[r.lead.product].count += 1;
    });
    return { totalPaid, pendingPayable, byProduct };
  }, [filtered, seeMargin]);

  const maxVal = Math.max(1, ...Object.values(stats.byProduct).map((v) => v.val), 0);

  function drillIntoProduct(product) {
    navigate(`/leads?product=${encodeURIComponent(product)}`);
  }

  if (isLoading) return <p className="subtle">Loading…</p>;

  const managerRow = team?.users?.find((u) => String(u._id) === String(user.reportsTo));

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtle">Showing data for you and everyone under you in the hierarchy ({user.role}: {user.name}).</p>

      {user.role === "Referral Partner" && managerRow && (
        <div className="help-note">
          Your {managerRow.role}: <b>{managerRow.name}</b> · {managerRow.phone}
          {managerRow.email ? ` · ${managerRow.email}` : ""}
        </div>
      )}

      <div className="help-note">
        {seeMargin
          ? "Earnings below reflect actual money received/paid so far, tracked as individual payments per lead — see the Accounting tab for expected amounts, balances, and partial-payment history."
          : "Figures below are your own payout only — the company's margin isn't shown at your role."}{" "}
        Click any product below to see its leads.
      </div>

      <div className="filter-bar">
        <div className="field">
          <label>From</label>
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div className="field">
          <label>To</label>
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
        <div className="field">
          <label>Product</label>
          <select value={filters.product} onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))}>
            <option value="All">All products</option>
            {(settings?.products || []).map((p) => (
              <option key={p._id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <button className="btn-sm" onClick={() => setFilters({ from: "", to: "", product: "All" })}>
            Clear filters
          </button>
        </div>
      </div>

      {seeMargin && (
        <>
          <h2 style={{ margin: "0 0 10px", fontSize: 15 }}>Disbursement Done — Commission overview</h2>
          <div className="row" style={{ marginBottom: 20 }}>
            <StatCard label="Total commission receivable" value={inr(commissionStats.totalCommissionReceivable)} cls="gold" />
            <StatCard label="Commission already received" value={inr(commissionStats.commissionReceived)} cls="green" />
            <StatCard label="Commission balance receivable" value={inr(commissionStats.commissionBalance)} valueStyle={{ color: "#E57373" }} />
          </div>
        </>
      )}

      <div className="row" style={{ marginBottom: 16 }}>
        {seeMargin ? (
          <>
            <StatCard label="Commission received" value={inr(stats.totalReceived)} cls="gold" />
            <StatCard label="Service fee received" value={inr(stats.totalServiceFee)} />
            <StatCard label="Payouts paid to partners" value={inr(stats.totalPaid)} />
            <StatCard label="Net (received − paid)" value={inr(stats.totalReceived + stats.totalServiceFee - stats.totalPaid)} cls="green" />
            <StatCard label="Commission still pending" value={inr(stats.pendingReceivable)} style={{ color: "var(--amber)" }} />
          </>
        ) : (
          <>
            <StatCard label="Your payouts received" value={inr(stats.totalPaid)} cls="gold" />
            <StatCard label="Payouts still pending" value={inr(stats.pendingPayable)} style={{ color: "var(--amber)" }} />
          </>
        )}
      </div>

      <div className="card">
        <h2>
          {seeMargin ? "Commission received, by product" : "Your payouts, by product"}{" "}
          <span className="subtle" style={{ fontSize: 11 }}>(click a product to see its leads)</span>
        </h2>
        {Object.keys(stats.byProduct).length === 0 ? (
          <p className="subtle">No matching leads.</p>
        ) : (
          Object.entries(stats.byProduct).map(([p, v]) => (
            <div key={p} className="clickable" onClick={() => drillIntoProduct(p)} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{p}</span>
                <span className="num">
                  {inr(v.val)} · {v.count} lead{v.count === 1 ? "" : "s"}
                </span>
              </div>
              <div style={{ background: "#EEECE7", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ background: "var(--gold)", height: 8, width: `${((v.val / maxVal) * 100).toFixed(1)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, cls, style, valueStyle }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${cls ? ` ${cls}` : ""}`} style={valueStyle || style}>
        {value}
      </div>
    </div>
  );
}
