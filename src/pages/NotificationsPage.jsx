import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotificationsAPI } from "../api/endpoints";
import { fmtDate } from "../constants";

const PAGE_SIZES = [10, 20, 50, 100];

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page, limit],
    queryFn: () => NotificationsAPI.list({ page, limit }),
  });

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <>
      <h1>Notifications</h1>
      <div className="help-note">
        These are simulated in-app notifications for this prototype — no real email, SMS, or WhatsApp is sent. Wiring this
        to a real channel needs a backend integration with that provider.
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead><tr><th>When</th><th>Lead</th><th>Update</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row"><td colSpan={3}>Loading…</td></tr>
            ) : notifications.length === 0 ? (
              <tr className="empty-row"><td colSpan={3}>No notifications yet.</td></tr>
            ) : (
              notifications.map((n) => (
                <tr key={n._id}>
                  <td className="subtle" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(n.createdAt)}</td>
                  <td>{n.customerName}</td>
                  <td>{n.message}</td>
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
    </>
  );
}
