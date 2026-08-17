import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { VerificationAPI, TeamAPI, SettingsAPI } from "../api/endpoints";
import { canVerify, canVerifyActions, fmtDate, verificationStatusInfo } from "../constants";
import { evaluateConditions } from "../utils/filterEngine";
import VerificationBadge from "../components/VerificationBadge";
import FilterBuilder from "../components/FilterBuilder";
import RejectModal from "../components/RejectModal";
import NotesModal from "../components/NotesModal";
import VerificationHistoryModal from "../components/VerificationHistoryModal";
import { ImageModal } from "../components/ViewModal";
import LeadDetailsModal from "../components/accountingModals/LeadDetailsModal";

const QUEUE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "duplicate_flag", label: "Possible duplicate" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const FINAL_STATUS_OPTIONS = [
  { value: "draft", label: "Draft — not yet submitted" },
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PAGE_SIZES = [10, 20, 50, 100];

export default function VerificationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState("new");
  const [queuePage, setQueuePage] = useState(1);
  const [queueLimit, setQueueLimit] = useState(20);
  const [finalPage, setFinalPage] = useState(1);
  const [finalLimit, setFinalLimit] = useState(20);
  const [queueConditions, setQueueConditions] = useState([]);
  const [queueJoinMode, setQueueJoinMode] = useState("AND");
  const [finalConditions, setFinalConditions] = useState([]);
  const [finalJoinMode, setFinalJoinMode] = useState("AND");

  const { data, isLoading } = useQuery({
    queryKey: ["verification-queues", activeTab, activeTab === "new" ? { page: queuePage, limit: queueLimit } : { page: finalPage, limit: finalLimit }],
    queryFn: () => VerificationAPI.queues({ tab: activeTab, page: activeTab === "new" ? queuePage : finalPage, limit: activeTab === "new" ? queueLimit : finalLimit }),
    enabled: canVerify(user),
  });
  const { data: allUsers = [] } = useQuery({ queryKey: ["team-all"], queryFn: TeamAPI.listAll });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: SettingsAPI.get });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["verification-queues"] });
    qc.invalidateQueries({ queryKey: ["verification-badge"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  function switchTab(tab) {
    setActiveTab(tab);
    if (tab === "new") setQueuePage(1);
    else setFinalPage(1);
  }

  async function approve(leadId, field) {
    await VerificationAPI.approve(leadId, field);
    invalidate();
  }
  function reject(leadId, field) {
    setModal({ type: "reject", leadId, field });
  }

  function partnerName(id) {
    return allUsers.find((u) => u._id === id)?.name || "—";
  }

  const userOptions = useMemo(() => allUsers.map((u) => ({ value: u._id, label: u.name })), [allUsers]);
  const productOptions = useMemo(
    () => (settings?.products || []).map((p) => ({ value: p.name, label: p.name })),
    [settings]
  );

  const queueFields = useMemo(
    () => ({
      customerName: { label: "Customer name", type: "text", getValue: (l) => l.customerName },
      phone: { label: "Phone", type: "text", getValue: (l) => l.phone },
      product: { label: "Product", type: "select", options: productOptions, getValue: (l) => l.product },
      partnerId: { label: "Sourced by", type: "select", options: userOptions, getValue: (l) => l.partnerId },
      status: { label: "Status", type: "select", options: QUEUE_STATUS_OPTIONS, getValue: (l) => l.verification.status },
      createdAt: { label: "Added on", type: "date", getValue: (l) => l.createdAt },
    }),
    [productOptions, userOptions]
  );
  const finalFields = useMemo(
    () => ({
      customerName: { label: "Customer name", type: "text", getValue: (l) => l.customerName },
      phone: { label: "Phone", type: "text", getValue: (l) => l.phone },
      product: { label: "Product", type: "select", options: productOptions, getValue: (l) => l.product },
      partnerId: { label: "Sourced by", type: "select", options: userOptions, getValue: (l) => l.partnerId },
      status: { label: "Status", type: "select", options: FINAL_STATUS_OPTIONS, getValue: (l) => l.finalVerification.status },
      disbursedOn: { label: "Disbursed on", type: "date", getValue: (l) => l.disbursement.date },
    }),
    [productOptions, userOptions]
  );

  if (!canVerify(user)) return <><h1>Verification</h1><p className="subtle">Only Team Leads and above can verify leads.</p></>;
  if (isLoading) return <p className="subtle">Loading…</p>;

  const tabData = data || {};
  const currentItems = activeTab === "new" ? (tabData.queue || []) : (tabData.finalQueue || []);
  const currentTotal = tabData.total || 0;
  const currentPage = tabData.page || 1;
  const totalPages = tabData.totalPages || 1;

  const filteredQueue = activeTab === "new" ? currentItems.filter((l) => evaluateConditions(l, queueConditions, queueJoinMode, queueFields)) : [];
  const filteredFinalQueue = activeTab === "final" ? currentItems.filter((l) => evaluateConditions(l, finalConditions, finalJoinMode, finalFields)) : [];

  const TABS = [
    ["new", "New leads awaiting review"],
    ["final", "Final check — disbursed leads awaiting closure"],
  ];

  return (
    <>
      <h1>Verification queue</h1>
      <p className="subtle">
        Every lead flagged for a human check — newly added, matching an existing phone number, or awaiting a final check
        after disbursement. Approved/rejected leads stay listed here with their outcome; use the filters below to narrow
        the table down.
      </p>

      <div className="tabs" style={{ background: "transparent", padding: 0, marginBottom: 16 }}>
        {TABS.map(([key, label]) => (
          <div key={key} className={`tab${activeTab === key ? " active" : ""}`} onClick={() => switchTab(key)}>
            {label} {activeTab === key && currentTotal ? `(${currentTotal})` : ""}
          </div>
        ))}
      </div>

      {activeTab === "new" && (
        <>
          <FilterBuilder
            fieldsConfig={queueFields}
            conditions={queueConditions}
            setConditions={setQueueConditions}
            joinMode={queueJoinMode}
            setJoinMode={setQueueJoinMode}
          />
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table>
              <thead>
                <tr><th>Customer</th><th>Product</th><th>Sourced by</th><th>Status</th><th>ID proof</th><th>Added</th><th></th></tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr className="empty-row"><td colSpan={7}>{currentItems.length === 0 ? "No leads yet." : "No leads match these filters."}</td></tr>
                ) : (
                  filteredQueue.map((lead) => {
                    const actionable = ["pending", "duplicate_flag"].includes(lead.verification.status);
                    return (
                      <tr key={lead._id}>
                        <td>
                          <button
                            className="btn-link"
                            onClick={() => setModal({ type: "details", lead })}
                            style={{ textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", color: "var(--blue)", textDecoration: "underline", fontSize: "inherit", fontWeight: "inherit" }}
                          >
                            {lead.customerName}
                          </button>
                          <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
                            {lead.phone}
                            {" "}·{" "}
                            <a href="#" onClick={(e) => { e.preventDefault(); setModal({ type: "notes", lead }); }}>Notes</a>
                          </div>
                        </td>
                        <td>{lead.product}</td>
                        <td>{partnerName(lead.partnerId)}</td>
                        <td>
                          <VerificationBadge status={lead.verification.status} />
                          {lead.verification.note && <div className="subtle" style={{ fontSize: 11, marginTop: 3 }}>{lead.verification.note}</div>}
                          <div style={{ marginTop: 3 }}>
                            <a href="#" style={{ fontSize: 11 }} onClick={(e) => { e.preventDefault(); setModal({ type: "history", lead }); }}>History</a>
                          </div>
                        </td>
                        <td>
                          {lead.verificationProofUrl ? (
                            <a href="#" onClick={(e) => { e.preventDefault(); setModal({ type: "image", title: "ID/KYC proof", src: lead.verificationProofUrl }); }}>View</a>
                          ) : (
                            <span className="subtle" style={{ fontSize: 11 }}>None</span>
                          )}
                        </td>
                        <td>{fmtDate(lead.createdAt)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {actionable && canVerifyActions(user) ? (
                            <>
                              <button className="btn-sm btn-approve" onClick={() => approve(lead._id, "verification")}>Approve</button>{" "}
                              <button className="btn-sm btn-reject" onClick={() => reject(lead._id, "verification")}>Reject</button>
                            </>
                          ) : (
                            <span className="subtle" style={{ fontSize: 11 }}>{verificationStatusInfo(lead.verification.status).label}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {currentTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
              <span className="subtle" style={{ margin: 0, fontSize: 12 }}>
                Showing {(queuePage - 1) * queueLimit + 1}–{Math.min(queuePage * queueLimit, currentTotal)} of {currentTotal}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select style={{ width: "auto" }} value={queueLimit} onChange={(e) => { setQueueLimit(Number(e.target.value)); setQueuePage(1); }}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
                <button className="btn-sm" disabled={queuePage <= 1} onClick={() => setQueuePage((p) => Math.max(1, p - 1))}>← Prev</button>
                <span className="subtle" style={{ margin: 0, fontSize: 12 }}>Page {queuePage} of {totalPages}</span>
                <button className="btn-sm" disabled={queuePage >= totalPages} onClick={() => setQueuePage((p) => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "final" && (
        <>
          <FilterBuilder
            fieldsConfig={finalFields}
            conditions={finalConditions}
            setConditions={setFinalConditions}
            joinMode={finalJoinMode}
            setJoinMode={setFinalJoinMode}
          />
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table>
              <thead>
                <tr><th>Customer</th><th>Product</th><th>Sourced by</th><th>Status</th><th>Disbursement proof</th><th>Disbursed on</th><th></th></tr>
              </thead>
              <tbody>
                {filteredFinalQueue.length === 0 ? (
                  <tr className="empty-row"><td colSpan={7}>{currentItems.length === 0 ? "No disbursed leads yet." : "No leads match these filters."}</td></tr>
                ) : (
                  filteredFinalQueue.map((lead) => {
                    const actionable = lead.finalVerification.status === "pending";
                    return (
                      <tr key={lead._id}>
                        <td>
                          <button
                            className="btn-link"
                            onClick={() => setModal({ type: "details", lead })}
                            style={{ textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", color: "var(--blue)", textDecoration: "underline", fontSize: "inherit", fontWeight: "inherit" }}
                          >
                            {lead.customerName}
                          </button>
                          <div style={{ marginTop: 3 }}>
                            <a href="#" style={{ fontSize: 11 }} onClick={(e) => { e.preventDefault(); setModal({ type: "history", lead }); }}>History</a>
                          </div>
                        </td>
                        <td>{lead.product}</td>
                        <td>{partnerName(lead.partnerId)}</td>
                        <td>
                          <VerificationBadge status={lead.finalVerification.status} />
                          {lead.finalVerification.note && lead.finalVerification.status === "rejected" && (
                            <div className="subtle" style={{ fontSize: 11, marginTop: 3 }}>"{lead.finalVerification.note}"</div>
                          )}
                        </td>
                        <td>
                          {lead.disbursement.proofPhotoUrl ? (
                            <a href="#" onClick={(e) => { e.preventDefault(); setModal({ type: "image", title: "Disbursement proof", src: lead.disbursement.proofPhotoUrl }); }}>View proof</a>
                          ) : (
                            <span className="subtle" style={{ fontSize: 11 }}>No proof attached</span>
                          )}
                          {lead.disbursement.proofNote && <div className="subtle" style={{ fontSize: 11 }}>{lead.disbursement.proofNote}</div>}
                        </td>
                        <td>{fmtDate(lead.disbursement.date)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {actionable && canVerifyActions(user) ? (
                            <>
                              <button className="btn-sm btn-approve" onClick={() => approve(lead._id, "finalVerification")}>Approve</button>{" "}
                              <button className="btn-sm btn-reject" onClick={() => reject(lead._id, "finalVerification")}>Reject</button>
                            </>
                          ) : (
                            <span className="subtle" style={{ fontSize: 11 }}>{verificationStatusInfo(lead.finalVerification.status).label}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {currentTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
              <span className="subtle" style={{ margin: 0, fontSize: 12 }}>
                Showing {(finalPage - 1) * finalLimit + 1}–{Math.min(finalPage * finalLimit, currentTotal)} of {currentTotal}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select style={{ width: "auto" }} value={finalLimit} onChange={(e) => { setFinalLimit(Number(e.target.value)); setFinalPage(1); }}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
                <button className="btn-sm" disabled={finalPage <= 1} onClick={() => setFinalPage((p) => Math.max(1, p - 1))}>← Prev</button>
                <span className="subtle" style={{ margin: 0, fontSize: 12 }}>Page {finalPage} of {totalPages}</span>
                <button className="btn-sm" disabled={finalPage >= totalPages} onClick={() => setFinalPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}

      {modal?.type === "reject" && (
        <RejectModal
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await VerificationAPI.reject(modal.leadId, modal.field, reason);
            invalidate();
          }}
        />
      )}
      {modal?.type === "notes" && <NotesModal lead={modal.lead} onClose={() => setModal(null)} />}
      {modal?.type === "history" && <VerificationHistoryModal lead={modal.lead} allUsers={allUsers} onClose={() => setModal(null)} />}
      {modal?.type === "image" && <ImageModal title={modal.title} src={modal.src} onClose={() => setModal(null)} />}
      {modal?.type === "details" && <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)} />}
    </>
  );
}
