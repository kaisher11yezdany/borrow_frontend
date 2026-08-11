import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskAPI, TeamAPI } from "../api/endpoints";
import { fmtDate, fmtDateTime } from "../constants";
import LeadDetailsModal from "../components/accountingModals/LeadDetailsModal";

const STATUS_OPTIONS = [
  { value: "Not Started", label: "Not Started", color: "gray" },
  { value: "Pending", label: "Pending", color: "amber" },
  { value: "Progress", label: "Progress", color: "blue" },
  { value: "Completed", label: "Completed", color: "green" },
];

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

const PAGE_SIZES = [10, 20, 50, 100];

export default function TasksPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-tasks", page, limit, search, status, priority],
    queryFn: () =>
      TaskAPI.listAll({
        page,
        limit,
        search,
        status,
        priority,
      }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["team-all"],
    queryFn: () => TeamAPI.listAll(),
  });

  const tasks = data?.tasks || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  function partnerName(id) {
    return allUsers.find((u) => u._id === id)?.name || "—";
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await TaskAPI.update(taskId, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    } catch (err) {
      alert("Failed to update task status");
    }
  }

  async function handlePriorityChange(taskId, newPriority) {
    try {
      await TaskAPI.update(taskId, { priority: newPriority });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    } catch (err) {
      alert("Failed to update task priority");
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await TaskAPI.delete(taskId);
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    } catch (err) {
      alert("Failed to delete task");
    }
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px" }}>Tasks</h1>
        <p className="subtle" style={{ margin: 0 }}>All tasks across all leads.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Search (task or lead name)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. KYC or Rajesh..."
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any priority</option>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card" style={{ padding: 0, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <table>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF8" }}>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Task</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Lead</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Status</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Priority</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Due Date</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Created By</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Created</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan={8}>Loading…</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8}>No tasks found.</td>
              </tr>
            ) : (
              tasks.map((task) => {
                const statusOption = STATUS_OPTIONS.find((s) => s.value === task.status);
                return (
                  <tr key={task._id}>
                    <td>
                      <strong style={{ fontSize: 14 }}>{task.title}</strong>
                      {task.description && (
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                          {task.description.substring(0, 50)}
                          {task.description.length > 50 ? "..." : ""}
                        </p>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => setModal({ type: "details", lead: task.lead })}
                        style={{
                          textAlign: "left",
                          padding: 0,
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          color: "var(--blue)",
                          textDecoration: "underline",
                          fontSize: "inherit",
                          fontWeight: "inherit",
                        }}
                      >
                        {task.lead?.customerName || "—"}
                      </button>
                      <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
                        ID: {task.lead?._id || "—"}
                      </div>
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid var(--border)",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={task.priority}
                        onChange={(e) => handlePriorityChange(task._id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid var(--border)",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {task.dueDate ? fmtDate(task.dueDate) : "—"}
                    </td>
                    <td>
                      {task.createdBy?.name || "—"}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {fmtDateTime(task.createdAt)}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn-sm btn-ghost"
                        style={{ color: "var(--red)" }}
                        onClick={() => handleDeleteTask(task._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {modal?.type === "details" && (
        <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)} />
      )}
    </>
  );
}
