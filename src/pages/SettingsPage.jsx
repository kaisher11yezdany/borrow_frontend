import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { SettingsAPI } from "../api/endpoints";
import { canManageSettings } from "../constants";

function LookupCard({ title, help, items, onAdd, onToggle, placeholder }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    try {
      await onAdd(name.trim());
      setName("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not add");
    }
  }

  return (
    <div className="col card">
      <h2>{title}</h2>
      {help && <p className="subtle" style={{ fontSize: 11 }}>{help}</p>}
      <table>
        <thead><tr><th>{title.replace(/s$/, "")}</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="empty-row"><td colSpan={3}>Nothing added yet.</td></tr>
          ) : (
            items.map((it) => (
              <tr key={it._id}>
                <td>{it.name}</td>
                <td>{it.active ? <span className="badge green">Active</span> : <span className="badge gray">Hidden</span>}</td>
                <td><button className="btn-sm" onClick={() => onToggle(it._id)}>{it.active ? "Hide" : "Unhide"}</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form onSubmit={submit} style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} required />
        <button type="submit" className="btn-primary">Add</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function ProductsCard({ items, onAdd, onToggle, onSetColor }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    try {
      await onAdd(name.trim(), color);
      setName("");
      setColor("#3B82F6");
    } catch (err) {
      setError(err.response?.data?.error || "Could not add");
    }
  }

  return (
    <div className="col card">
      <h2>Products</h2>
      <table>
        <thead><tr><th>Product</th><th>Color</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr className="empty-row"><td colSpan={4}>Nothing added yet.</td></tr>
          ) : (
            items.map((it) => (
              <tr key={it._id}>
                <td>{it.name}</td>
                <td>
                  <input
                    type="color"
                    value={it.color || "#3B82F6"}
                    onChange={(e) => onSetColor(it._id, e.target.value)}
                    style={{ width: 24, height: 24, cursor: "pointer", border: "1px solid var(--border)", padding: 0, margin: 0, flexShrink: 0 }}
                    title="Click to change color"
                  />
                </td>
                <td>{it.active ? <span className="badge green">Active</span> : <span className="badge gray">Hidden</span>}</td>
                <td><button className="btn-sm" onClick={() => onToggle(it._id)}>{it.active ? "Hide" : "Unhide"}</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form onSubmit={submit} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New product name" required />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ margin: 0 }}>Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 32, height: 26, cursor: "pointer", border: "1px solid var(--border)", padding: 2, flexShrink: 0 }}
          />
        </div>
        <button type="submit" className="btn-primary">Add</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function BanksCard({ products, banksByProduct, onAdd, onToggle }) {
  const [product, setProduct] = useState(products[0]?.name || "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const banks = banksByProduct?.[product] || [];

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    try {
      await onAdd(product, name.trim());
      setName("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not add");
    }
  }

  return (
    <div className="col card">
      <h2>Banks by product</h2>
      <div className="field">
        <label>Product</label>
        <select value={product} onChange={(e) => setProduct(e.target.value)}>
          {products.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
        </select>
      </div>
      <table>
        <thead><tr><th>Bank</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {banks.length === 0 ? (
            <tr className="empty-row"><td colSpan={3}>No banks added for this product yet.</td></tr>
          ) : (
            banks.map((b) => (
              <tr key={b._id}>
                <td>{b.name}</td>
                <td>{b.active ? <span className="badge green">Active</span> : <span className="badge gray">Hidden</span>}</td>
                <td><button className="btn-sm" onClick={() => onToggle(b._id)}>{b.active ? "Hide" : "Unhide"}</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <form onSubmit={submit} style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New bank name" required />
        <button type="submit" className="btn-primary">Add</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  if (!canManageSettings(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get, enabled: canManageSettings(user) });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  if (isLoading) return <p className="subtle">Loading…</p>;

  const { products = [], banksByProduct = {}, expenseTypes = [], companyBankAccounts = [], digitalChannels = [] } = data || {};

  return (
    <>
      <h1>Settings</h1>
      <p className="subtle">Manage products, banks per product, and expense categories.</p>
      <div className="row">
        <ProductsCard
          items={products}
          onAdd={async (name, color) => { await SettingsAPI.addProduct(name, color); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleProduct(id); invalidate(); }}
          onSetColor={async (id, color) => { await SettingsAPI.setProductColor(id, color); invalidate(); }}
        />
        <BanksCard
          products={products}
          banksByProduct={banksByProduct}
          onAdd={async (product, name) => { await SettingsAPI.addBank(product, name); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleBank(id); invalidate(); }}
        />
        <LookupCard
          title="Expense types"
          help="Soft-coded — this list controls what shows up when adding an expense to a lead in Accounting."
          items={expenseTypes}
          placeholder="New expense type"
          onAdd={async (name) => { await SettingsAPI.addExpenseType(name); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleExpenseType(id); invalidate(); }}
        />
        <LookupCard
          title="Company bank accounts"
          help="Your own accounts — used for 'received into' / 'paid from' on each accounting entry and expense."
          items={companyBankAccounts}
          placeholder="New account name"
          onAdd={async (name) => { await SettingsAPI.addCompanyBankAccount(name); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleCompanyBankAccount(id); invalidate(); }}
        />
        <LookupCard
          title="Digital marketing channels"
          help="Shown when a lead's source is 'Digital Marketing' — the cascading channel picker on the Add Lead form."
          items={digitalChannels}
          placeholder="New channel"
          onAdd={async (name) => { await SettingsAPI.addDigitalChannel(name); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleDigitalChannel(id); invalidate(); }}
        />
        <LookupCard
          title="DSA codes"
          help="Bank DSA (Digital Solutions Architecture) codes — available when moving a lead to 'Login Done'."
          items={data?.dsaCodes || []}
          placeholder="New DSA code"
          onAdd={async (name) => { await SettingsAPI.addDSACode(name); invalidate(); }}
          onToggle={async (id) => { await SettingsAPI.toggleDSACode(id); invalidate(); }}
        />
      </div>
      <div className="card">
        <h2>Data security — please read</h2>
        <p className="subtle" style={{ marginBottom: 0 }}>
          Access control (who can log in and see what) and audit logs (the Notifications tab) are the real protections
          here — not client-side tricks. There's no "disable right-click" style blocker since that wouldn't actually stop
          anything.
        </p>
      </div>
    </>
  );
}
