import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { LeadsAPI, AccountingAPI, RemindersAPI, TeamAPI, SettingsAPI } from "../api/endpoints";
import { STAGES, canDeleteLeads } from "../constants";
import { useLeadRealtime } from "../hooks/useLeadRealtime";
import LeadRow from "../components/LeadRow";
import AddLeadModal from "../components/leadModals/AddLeadModal";
import BulkUploadModal from "../components/leadModals/BulkUploadModal";
import EditLeadModal from "../components/leadModals/EditLeadModal";
import AdvanceStageModal from "../components/leadModals/AdvanceStageModal";
import EditStageDetailsModal from "../components/leadModals/EditStageDetailsModal";
import CloseLeadModal from "../components/leadModals/CloseLeadModal";
import FinalSubmitModal from "../components/leadModals/FinalSubmitModal";
import FixDisbursementModal from "../components/leadModals/FixDisbursementModal";
import RemindersModal from "../components/RemindersModal";
import NotesModal from "../components/NotesModal";
import CommentsModal from "../components/CommentsModal";
import AttachmentsModal from "../components/AttachmentsModal";
import VerificationHistoryModal from "../components/VerificationHistoryModal";
import { ImageModal } from "../components/ViewModal";
import LeadDetailsModal from "../components/accountingModals/LeadDetailsModal";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "duplicate_flag", label: "Possible duplicate" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const EMPTY_FILTERS = { search: "", product: "All", partnerId: "", stage: "", status: "", loanType: "", from: "", to: "" };
const PAGE_SIZES = [10, 20, 50, 100];

export default function LeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, product: searchParams.get("product") || "All" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modal, setModal] = useState(null); // {type, lead?, title?, src?}
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const canDelete = canDeleteLeads(user);
  // The select-all column only renders for roles that may bulk delete.
  const colCount = canDelete ? 13 : 12;

  function updateFilter(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["leads", filters, page, limit],
    queryFn: () =>
      LeadsAPI.list({
        search: filters.search || undefined,
        product: filters.product !== "All" ? filters.product : undefined,
        partnerId: filters.partnerId || undefined,
        stage: filters.stage || undefined,
        status: filters.status || undefined,
        loanType: filters.loanType || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit,
      }),
  });
  const { data: allUsers = [] } = useQuery({ queryKey: ["team-all"], queryFn: TeamAPI.listAll });
  const { data: acctData } = useQuery({ queryKey: ["accounting"], queryFn: AccountingAPI.list });
  const { data: remindersBoard } = useQuery({ queryKey: ["reminders-board"], queryFn: RemindersAPI.board });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // If a filter change (or deleting the last item on a page) leaves the
  // current page out of range, snap back instead of showing an empty table.
  useEffect(() => {
    if (!isLoading && page > totalPages) setPage(totalPages);
  }, [isLoading, page, totalPages]);

  useLeadRealtime();

  const acctByLead = useMemo(() => {
    const map = new Map();
    (acctData?.rows || []).forEach((r) => map.set(String(r.lead._id), r));
    return map;
  }, [acctData]);

  const nextReminderByLead = useMemo(() => {
    const all = [
      ...(remindersBoard?.overdue || []),
      ...(remindersBoard?.dueToday || []),
      ...(remindersBoard?.upcoming || []),
    ];
    const map = new Map();
    all.forEach(({ lead, reminder }) => {
      const key = String(lead._id);
      const existing = map.get(key);
      if (!existing || new Date(reminder.date) < new Date(existing.date)) map.set(key, reminder);
    });
    return map;
  }, [remindersBoard]);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["accounting"] });
    qc.invalidateQueries({ queryKey: ["verification-badge"] });
    qc.invalidateQueries({ queryKey: ["reminders-board"] });
    qc.invalidateQueries({ queryKey: ["reminder-badge"] });
  }

  const actions = {
    onEdit: (lead) => setModal({ type: "edit", lead }),
    onAdvance: (lead) => setModal({ type: "advance", lead }),
    onEditStage: (lead) => setModal({ type: "editStage", lead }),
    onCloseLead: (lead) => setModal({ type: "close", lead }),
    onFinalSubmit: (lead) => setModal({ type: "finalSubmit", lead }),
    onFixDisbursement: (lead) => setModal({ type: "fixDisbursement", lead }),
    onManageReminders: (lead) => setModal({ type: "reminders", lead }),
    onManageNotes: (lead) => setModal({ type: "notes", lead }),
    onManageComments: (lead) => setModal({ type: "comments", lead }),
    onManageAttachments: (lead) => setModal({ type: "attachments", lead }),
    onViewHistory: (lead) => setModal({ type: "history", lead }),
    onViewImage: (src, title) => setModal({ type: "image", src, title }),
    onViewDetails: (lead) => setModal({ type: "details", lead }),
    onReassign: async (lead, partnerId) => {
      await LeadsAPI.reassign(lead._id, partnerId);
      invalidateAll();
    },
    onReopen: async (lead) => {
      if (!window.confirm("Reopen this lead and put it back in the active pipeline?")) return;
      await LeadsAPI.reopen(lead._id);
      invalidateAll();
    },
    onDelete: async (lead) => {
      if (
        !window.confirm(
          `Permanently delete the lead for ${lead.customerName}? This removes it entirely, including its accounting history — there's no undo. If this lead is just withdrawn or rejected, Reopen instead and use Close, so the record is kept.`
        )
      )
        return;
      await LeadsAPI.remove(lead._id);
      invalidateAll();
    },
  };

  function closeModal() {
    setModal(null);
    invalidateAll();
  }

  function clearFilters() {
    setFilters({ ...EMPTY_FILTERS });
    setSearchParams({});
    setPage(1);
  }

  function toggleSelectLead(leadId) {
    setSelectedLeads((prev) => {
      const updated = new Set(prev);
      if (updated.has(leadId)) {
        updated.delete(leadId);
      } else {
        updated.add(leadId);
      }
      return updated;
    });
  }

  function toggleSelectAll() {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l._id)));
    }
  }

  async function bulkDeleteLeads() {
    if (!canDelete || selectedLeads.size === 0) return;
    const selected = leads.filter((l) => selectedLeads.has(l._id));
    const verified = selected.filter((l) => l.verification.status === "verified");
    const deletable = selected.length - verified.length;

    if (!deletable) {
      alert(
        `Verified leads can't be deleted directly — use "Request delete" on each one instead.\n\n` +
          `All ${selected.length} selected lead${selected.length === 1 ? " is" : "s are"} verified.`
      );
      return;
    }

    const warning = verified.length
      ? `\n\n${verified.length} verified lead${verified.length === 1 ? "" : "s"} will be skipped — verified leads need a deletion request.`
      : "";
    if (
      !window.confirm(
        `Permanently delete ${deletable} lead${deletable > 1 ? "s" : ""}? This action cannot be undone.${warning}`
      )
    )
      return;

    // One rejection must not abandon the rest of the batch, so each lead is
    // attempted independently and the failures are reported together.
    const failed = [];
    let deleted = 0;
    for (const lead of selected) {
      if (lead.verification.status === "verified") continue;
      try {
        await LeadsAPI.remove(lead._id);
        deleted += 1;
      } catch (err) {
        failed.push({
          id: lead._id,
          name: lead.customerName,
          reason: err.response?.data?.error || err.message,
        });
      }
    }

    // Leave the skipped and failed leads selected so the admin can act on them.
    const stillSelected = [...verified.map((l) => l._id), ...failed.map((f) => f.id)];
    setSelectedLeads(new Set(stillSelected));
    invalidateAll();

    if (failed.length) {
      const lines = failed.map((f) => `• ${f.name} — ${f.reason}`).join("\n");
      alert(`${deleted} deleted.\n\nCould not delete ${failed.length}:\n${lines}`);
    }
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && !(k === "product" && v === "All")).length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Leads</h1>
          <p className="subtle" style={{ margin: 0 }}>All leads sourced by you and your downline.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={() => setModal({ type: "bulkUpload" })} style={{ padding: "10px 22px", fontSize: "14px", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(27,36,48,0.1)" }}>📥 Bulk Import</button>
          <button className="btn-primary" onClick={() => setModal({ type: "add" })} style={{ padding: "10px 22px", fontSize: "14px", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(27,36,48,0.1)" }}>+ Add lead</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>Filters</h2>
          {activeFilterCount > 0 && (
            <button className="btn-sm btn-ghost" onClick={clearFilters} style={{ color: "var(--amber)", fontSize: "12px", fontWeight: "600" }}>
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Search (name or phone)</label>
            <input value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} placeholder="e.g. Reddy or 98765..." style={{ borderColor: "var(--border)" }} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Product</label>
            <select value={filters.product} onChange={(e) => updateFilter({ product: e.target.value })}>
              <option value="All">All products</option>
              {(settings?.products || []).map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sourced by</label>
            <select value={filters.partnerId} onChange={(e) => updateFilter({ partnerId: e.target.value })}>
              <option value="">Anyone</option>
              {allUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Stage</label>
            <select value={filters.stage} onChange={(e) => updateFilter({ stage: e.target.value })}>
              <option value="">Any stage</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
              <option value="">Any status</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Loan Type</label>
            <select value={filters.loanType} onChange={(e) => updateFilter({ loanType: e.target.value })}>
              <option value="">Any type</option>
              <option value="Secure">Secure</option>
              <option value="Unsecure">Unsecure</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Added from</label>
            <input type="date" value={filters.from} onChange={(e) => updateFilter({ from: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Added to</label>
            <input type="date" value={filters.to} onChange={(e) => updateFilter({ to: e.target.value })} />
          </div>
        </div>
      </div>

      {canDelete && selectedLeads.size > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", padding: "12px 16px", backgroundColor: "#F0F4F8", borderRadius: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: "500" }}>{selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected</span>
          <button className="btn-sm" onClick={bulkDeleteLeads} style={{ color: "white", backgroundColor: "var(--red)", border: "none" }}>
            🗑️ Delete Selected
          </button>
          <button className="btn-sm" onClick={() => setSelectedLeads(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <table>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF8" }}>
              {canDelete && (
                <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)", width: "40px", textAlign: "center" }}>
                  <input type="checkbox" checked={leads.length > 0 && selectedLeads.size === leads.length} onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
                </th>
              )}
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Customer</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Product</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Loan Type</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Amount</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Sourced by</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Status</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Stage</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Accounting</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Follow-up</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Created</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}>Updated</th>
              <th style={{ fontWeight: "700", color: "var(--ink)", borderBottom: "2px solid var(--border)" }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row"><td colSpan={colCount}>Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr className="empty-row"><td colSpan={colCount}>No leads match. Try clearing filters or add a lead.</td></tr>
            ) : (
              leads.map((lead) => (
                <LeadRow
                  key={lead._id}
                  lead={lead}
                  cu={user}
                  allUsers={allUsers}
                  acctEntries={acctByLead.get(String(lead._id))}
                  nextReminder={nextReminderByLead.get(String(lead._id))}
                  actions={actions}
                  isSelected={selectedLeads.has(lead._id)}
                  onSelectToggle={() => toggleSelectLead(lead._id)}
                  onViewDetails={actions.onViewDetails}
                />
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

      {modal?.type === "add" && <AddLeadModal onClose={closeModal} />}
      {modal?.type === "bulkUpload" && <BulkUploadModal onClose={closeModal} />}
      {modal?.type === "edit" && <EditLeadModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "advance" && <AdvanceStageModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "editStage" && <EditStageDetailsModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "close" && <CloseLeadModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "finalSubmit" && <FinalSubmitModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "fixDisbursement" && <FixDisbursementModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "reminders" && <RemindersModal lead={modal.lead} onClose={closeModal} />}
      {modal?.type === "notes" && <NotesModal lead={modal.lead} onClose={() => setModal(null)} />}
      {modal?.type === "comments" && <CommentsModal lead={modal.lead} onClose={() => setModal(null)} />}
      {modal?.type === "attachments" && <AttachmentsModal lead={modal.lead} onClose={() => setModal(null)} />}
      {modal?.type === "history" && <VerificationHistoryModal lead={modal.lead} allUsers={allUsers} onClose={() => setModal(null)} />}
      {modal?.type === "image" && <ImageModal title={modal.title} src={modal.src} onClose={() => setModal(null)} />}
      {modal?.type === "details" && <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)} />}
    </>
  );
}
