import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { RemindersAPI } from "../api/endpoints";
import { canUpdateStage, fmtDate } from "../constants";
import RemindersModal from "../components/RemindersModal";

const PAGE_SIZES = [10, 20, 50, 100];

export default function RemindersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [manageLead, setManageLead] = useState(null);
  const [activeTab, setActiveTab] = useState("overdue");
  const [overduePage, setOverduePage] = useState(1);
  const [overdueLimit, setOverdueLimit] = useState(20);
  const [dueTodayPage, setDueTodayPage] = useState(1);
  const [dueTodayLimit, setDueTodayLimit] = useState(20);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingLimit, setUpcomingLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["reminders-board"],
    queryFn: () => RemindersAPI.board(),
    enabled: canUpdateStage(user),
  });

  // Calculate paginated views on client side
  const { overdueItems, overduePaginatedItems, dueTodayItems, dueTodayPaginatedItems, upcomingItems, upcomingPaginatedItems } = useMemo(() => {
    const overdue = data?.overdue || [];
    const dueToday = data?.dueToday || [];
    const upcoming = data?.upcoming || [];

    return {
      overdueItems: overdue,
      overduePaginatedItems: overdue.slice((overduePage - 1) * overdueLimit, overduePage * overdueLimit),
      dueTodayItems: dueToday,
      dueTodayPaginatedItems: dueToday.slice((dueTodayPage - 1) * dueTodayLimit, dueTodayPage * dueTodayLimit),
      upcomingItems: upcoming,
      upcomingPaginatedItems: upcoming.slice((upcomingPage - 1) * upcomingLimit, upcomingPage * upcomingLimit),
    };
  }, [data, overduePage, overdueLimit, dueTodayPage, dueTodayLimit, upcomingPage, upcomingLimit]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["reminders-board"] });
    qc.invalidateQueries({ queryKey: ["reminder-badge"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function markDone(id) {
    await RemindersAPI.markDone(id);
    invalidate();
  }

  if (!canUpdateStage(user)) return <><h1>Reminders</h1><p className="subtle">Not available at your role.</p></>;
  if (isLoading) return <p className="subtle">Loading…</p>;

  const overduePages = Math.ceil(overdueItems.length / overdueLimit);
  const dueTodayPages = Math.ceil(dueTodayItems.length / dueTodayLimit);
  const upcomingPages = Math.ceil(upcomingItems.length / upcomingLimit);

  // Determine current tab's data
  const getCurrentTabData = () => {
    switch (activeTab) {
      case "dueToday":
        return { items: dueTodayPaginatedItems, total: dueTodayItems.length, page: dueTodayPage, pages: dueTodayPages, limit: dueTodayLimit, setPage: setDueTodayPage, setLimit: setDueTodayLimit, emptyMsg: "Nothing due today." };
      case "upcoming":
        return { items: upcomingPaginatedItems, total: upcomingItems.length, page: upcomingPage, pages: upcomingPages, limit: upcomingLimit, setPage: setUpcomingPage, setLimit: setUpcomingLimit, emptyMsg: "Nothing scheduled ahead." };
      default:
        return { items: overduePaginatedItems, total: overdueItems.length, page: overduePage, pages: overduePages, limit: overdueLimit, setPage: setOverduePage, setLimit: setOverdueLimit, emptyMsg: "Nothing overdue." };
    }
  };

  const tabData = getCurrentTabData();

  const TABS = [
    ["overdue", `Overdue (${overdueItems.length})`],
    ["dueToday", `Due today (${dueTodayItems.length})`],
    ["upcoming", `Upcoming (${upcomingItems.length})`],
  ];

  return (
    <>
      <h1>Reminders</h1>
      <p className="subtle">
        Follow-ups worth revisiting — customers who might need another loan, want a better rate elsewhere, or fit a
        cross-sell. Case details give you the context to decide who's worth your time.
      </p>

      <div className="tabs" style={{ background: "transparent", padding: 0, marginBottom: 16 }}>
        {TABS.map(([key, label]) => (
          <div key={key} className={`tab${activeTab === key ? " active" : ""}`} onClick={() => setActiveTab(key)} style={{ cursor: "pointer" }}>
            {label}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead>
            <tr><th>Customer</th><th>Product</th><th>Reminder date</th><th>Case details</th><th></th></tr>
          </thead>
          <tbody>
            {tabData.items.length === 0 ? (
              <tr className="empty-row"><td colSpan={5}>{tabData.emptyMsg}</td></tr>
            ) : (
              tabData.items.map(({ lead, reminder }) => (
                <tr key={reminder._id}>
                  <td>
                    {lead.customerName}
                    <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
                      {lead.phone}{lead.city ? ` · ${lead.city}` : ""}
                    </div>
                  </td>
                  <td>{lead.product}</td>
                  <td>{fmtDate(reminder.date)}</td>
                  <td style={{ fontSize: 13 }}>{reminder.caseDetails}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn-sm btn-approve" onClick={() => markDone(reminder._id)}>Done</button>{" "}
                    <button className="btn-sm btn-ghost" onClick={() => setManageLead(lead)}>Manage</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tabData.total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          <span className="subtle" style={{ margin: 0, fontSize: 12 }}>
            Showing {(tabData.page - 1) * tabData.limit + 1}–{Math.min(tabData.page * tabData.limit, tabData.total)} of {tabData.total}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select style={{ width: "auto" }} value={tabData.limit} onChange={(e) => { tabData.setLimit(Number(e.target.value)); tabData.setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button className="btn-sm" disabled={tabData.page <= 1} onClick={() => tabData.setPage(Math.max(1, tabData.page - 1))}>← Prev</button>
            <span className="subtle" style={{ margin: 0, fontSize: 12 }}>Page {tabData.page} of {tabData.pages}</span>
            <button className="btn-sm" disabled={tabData.page >= tabData.pages} onClick={() => tabData.setPage(Math.min(tabData.pages, tabData.page + 1))}>Next →</button>
          </div>
        </div>
      )}

      {manageLead && (
        <RemindersModal
          lead={manageLead}
          onClose={() => {
            setManageLead(null);
            invalidate();
          }}
        />
      )}
    </>
  );
}
