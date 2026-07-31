import Tracker from "./Tracker";
import VerificationBadge from "./VerificationBadge";
import { STAGES, canEditLead, canUpdateStage, isClosed, inr, fmtDate, fmtDateTime, canSeeMargin } from "../constants";
import { installmentsTotal, entryBalance, entryStatusLabel } from "../utils/acct";

function isReminderOverdue(r) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(r.date) < today;
}

function statusBadgeForLead(lead) {
  if (isClosed(lead)) {
    return lead.closure.status === "withdrawn" ? <span className="badge gray">Withdrawn</span> : <span className="badge red">Declined</span>;
  }
  if (lead.stage === "Disbursement Done") {
    if (lead.finalVerification.status === "verified") return <span className="badge green">Completed</span>;
    if (lead.finalVerification.status === "rejected") return <span className="badge red">Final check rejected</span>;
    if (lead.finalVerification.status === "draft") return <span className="badge gray">Ready to submit</span>;
    return <span className="badge amber">Under verification</span>;
  }
  return <VerificationBadge status={lead.verification.status} />;
}

function AcctSummary({ entries, cu }) {
  if (!entries) return null;
  const rcvStatus = entryStatusLabel(entries.receivable, "Received");
  const payStatus = entryStatusLabel(entries.payable, "Paid");
  const rcvCls = rcvStatus === "Received" ? "green" : rcvStatus.startsWith("Partially") || rcvStatus === "Invoice Sent" ? "amber" : "gray";
  const payCls = payStatus === "Paid" ? "green" : payStatus.startsWith("Partially") || payStatus === "Invoice Sent" ? "amber" : "gray";
  if (canSeeMargin(cu)) {
    return (
      <>
        <div style={{ fontSize: 12 }}>
          Rcv: <span className="num">{inr(installmentsTotal(entries.receivable))}</span>{" "}
          <span className={`badge ${rcvCls}`} style={{ padding: "1px 6px" }}>{rcvStatus}</span>
        </div>
        <div style={{ fontSize: 12, marginTop: 3 }}>
          Pay: <span className="num">{inr(installmentsTotal(entries.payable))}</span>{" "}
          <span className={`badge ${payCls}`} style={{ padding: "1px 6px" }}>{payStatus}</span>
        </div>
      </>
    );
  }
  return (
    <div style={{ fontSize: 12 }}>
      Your payout: <span className="num">{inr(installmentsTotal(entries.payable))}</span>{" "}
      <span className={`badge ${payCls}`} style={{ padding: "1px 6px" }}>{payStatus}</span>
    </div>
  );
}

function FollowUpCell({ nextReminder, canManage, onManage }) {
  if (!nextReminder) {
    return canManage ? (
      <button className="btn-sm btn-ghost" onClick={onManage}>Set reminder</button>
    ) : (
      <span className="subtle" style={{ fontSize: 11 }}>—</span>
    );
  }
  const overdue = isReminderOverdue(nextReminder);
  return (
    <>
      <div className={`badge ${overdue ? "red" : "amber"}`} style={{ marginBottom: 3 }}>
        {overdue ? "Overdue" : "Due"} {fmtDate(nextReminder.date)}
      </div>
      <div className="subtle" style={{ fontSize: 11, maxWidth: 160 }}>{nextReminder.caseDetails}</div>
      {canManage && <button className="btn-sm btn-ghost" onClick={onManage}>Manage</button>}
    </>
  );
}

export default function LeadRow({ lead, cu, allUsers, acctEntries, nextReminder, actions, isSelected, onSelectToggle }) {
  const idx = STAGES.indexOf(lead.stage);
  const next = STAGES[idx + 1];
  const isLast = !next;
  const partner = allUsers.find((u) => u._id === lead.partnerId);

  // width:auto (not the global input/select 100%) so the column widens to
  // fit a long name instead of clipping it; the table's own overflow:auto
  // wrapper (see LeadsPage) scrolls horizontally if the table outgrows it.
  const partnerCell =
    cu.role === "Admin" ? (
      <select value={lead.partnerId} onChange={(e) => actions.onReassign(lead, e.target.value)} style={{ width: "auto", minWidth: 160 }}>
        {allUsers.map((u) => (
          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
        ))}
      </select>
    ) : (
      partner?.name || "—"
    );

  if (isClosed(lead)) {
    return (
      <tr style={{ opacity: 0.75, backgroundColor: isSelected ? "#E8F0FF" : undefined }}>
        <td style={{ width: "40px", textAlign: "center", padding: "8px 0" }}>
          <input type="checkbox" checked={isSelected} onChange={onSelectToggle} style={{ cursor: "pointer" }} />
        </td>
        <td>
          {lead.customerName}
          <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
            {lead.phone}
            {lead.city ? ` · ${lead.city}` : ""} · {fmtDate(lead.createdAt)}
            {" "}·{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); actions.onManageNotes(lead); }}>Notes</a>
            {" "}·{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); actions.onManageAttachments(lead); }}>Attachments</a>
          </div>
        </td>
        <td>
          <span className="badge" style={{ backgroundColor: lead.productColor || "#3B82F6", color: "white" }}>
            {lead.product}
          </span>
        </td>
        <td className="num">{inr(lead.loanAmount)}</td>
        <td style={{ whiteSpace: "nowrap" }}>{partnerCell}</td>
        <td>
          {statusBadgeForLead(lead)}
          <div className="subtle" style={{ fontSize: 11, marginTop: 3 }}>"{lead.closure.reason}"</div>
          <div style={{ marginTop: 3 }}>
            <a href="#" style={{ fontSize: 11 }} onClick={(e) => { e.preventDefault(); actions.onViewHistory(lead); }}>History</a>
          </div>
        </td>
        <td>
          <div className="tracker-label">Closed on {fmtDate(lead.closure.at)}</div>
        </td>
        <td>—</td>
        <td>
          <FollowUpCell nextReminder={nextReminder} canManage={canUpdateStage(cu)} onManage={() => actions.onManageReminders(lead)} />
        </td>
        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDateTime(lead.createdAt)}</td>
        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.updatedAt ? fmtDateTime(lead.updatedAt) : fmtDateTime(lead.createdAt)}</td>
        <td style={{ whiteSpace: "nowrap" }}>
          <button className="btn-sm btn-ghost" onClick={() => actions.onManageComments(lead)}>Comments</button>
          {cu.role === "Admin" && (
            <>
              {" "}
              <button className="btn-sm" onClick={() => actions.onReopen(lead)}>Reopen</button>{" "}
              <button className="btn-sm btn-reject" onClick={() => actions.onDelete(lead)}>Delete permanently</button>
            </>
          )}
        </td>
      </tr>
    );
  }

  let stageLabel = lead.stage;
  if (isLast) {
    if (lead.finalVerification.status === "verified") stageLabel = "Completed";
    else if (lead.finalVerification.status === "rejected") stageLabel = "Disbursement Done — final check rejected";
    else if (lead.finalVerification.status === "draft") stageLabel = "Disbursement Done — ready to submit for final verification";
    else stageLabel = "Disbursement Done — under verification";
  }

  const alreadyDone = isLast && lead.finalVerification.status === "verified";

  return (
    <tr style={{ backgroundColor: isSelected ? "#E8F0FF" : undefined }}>
      <td style={{ width: "40px", textAlign: "center", padding: "8px 0" }}>
        <input type="checkbox" checked={isSelected} onChange={onSelectToggle} style={{ cursor: "pointer" }} />
      </td>
      <td>
        {lead.customerName}
        <div className="subtle" style={{ margin: 0, fontSize: 11 }}>
          {lead.phone}
          {lead.city ? ` · ${lead.city}` : ""} · {fmtDate(lead.createdAt)}
          {" "}·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); actions.onManageNotes(lead); }}>Notes</a>
          {" "}·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); actions.onManageAttachments(lead); }}>Attachments</a>
        </div>
      </td>
      <td>
        <span className="badge" style={{ backgroundColor: lead.productColor || "#3B82F6", color: "white" }}>
          {lead.product}
        </span>
      </td>
      <td className="num">{inr(lead.loanAmount)}</td>
      <td>{partnerCell}</td>
      <td>
        {statusBadgeForLead(lead)}
        {lead.verification.note && lead.verification.status === "rejected" && (
          <div className="subtle" style={{ fontSize: 11, marginTop: 3 }}>"{lead.verification.note}"</div>
        )}
        {lead.finalVerification.note && lead.finalVerification.status === "rejected" && (
          <div className="subtle" style={{ fontSize: 11, marginTop: 3 }}>"{lead.finalVerification.note}"</div>
        )}
        <div style={{ marginTop: 3 }}>
          <a href="#" style={{ fontSize: 11 }} onClick={(e) => { e.preventDefault(); actions.onViewHistory(lead); }}>History</a>
        </div>
      </td>
      <td>
        <Tracker idx={idx} extra={isLast ? lead.finalVerification.status : null} />
        <div className="tracker-label">{stageLabel}</div>
        {lead.bankName && (
          <div style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.5 }}>
            <div><strong style={{ color: "var(--text)" }}>Bank:</strong> {lead.bankName}</div>
            {lead.dsaCode && <div><strong style={{ color: "var(--text)" }}>DSA:</strong> {lead.dsaCode}</div>}
            {lead.appId && <div><strong style={{ color: "var(--text)" }}>App ID:</strong> {lead.appId}</div>}
          </div>
        )}
        {!!lead.sanctionAmount && <div className="subtle" style={{ fontSize: 11, margin: "4px 0 0" }}>Sanctioned: {inr(lead.sanctionAmount)}</div>}
        {lead.stage === "Disbursement Done" && (
          <div style={{ margin: "4px 0 0", fontSize: 11 }}>
            <div className="subtle">Disbursed: {inr(lead.disbursement.amount)}</div>
            <div className="subtle">Date: {fmtDate(lead.disbursement.date)}</div>
            <div className="subtle">
              Proof:{" "}
              {lead.disbursement.proofPhotoUrl ? (
                <a href="#" onClick={(e) => { e.preventDefault(); actions.onViewImage(lead.disbursement.proofPhotoUrl, "Disbursement proof"); }}>view</a>
              ) : (
                "none"
              )}
            </div>
          </div>
        )}
      </td>
      <td><AcctSummary entries={acctEntries} cu={cu} /></td>
      <td>
        <FollowUpCell nextReminder={nextReminder} canManage={canUpdateStage(cu)} onManage={() => actions.onManageReminders(lead)} />
      </td>
      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDateTime(lead.createdAt)}</td>
      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.updatedAt ? fmtDateTime(lead.updatedAt) : fmtDateTime(lead.createdAt)}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {isLast ? (
          <>
            {lead.finalVerification.status === "draft" && canUpdateStage(cu) && (
              <button className="btn-sm" onClick={() => actions.onFinalSubmit(lead)}>Review & Submit →</button>
            )}
            {lead.finalVerification.status === "rejected" && canUpdateStage(cu) && (
              <button className="btn-sm" onClick={() => actions.onFixDisbursement(lead)}>Fix & resubmit</button>
            )}
            {lead.finalVerification.status === "pending" && (
              <span className="subtle" style={{ fontSize: 11 }}>Awaiting final check</span>
            )}
          </>
        ) : canUpdateStage(cu) ? (
          lead.verification.status === "verified" ? (
            <button className="btn-sm" onClick={() => actions.onAdvance(lead)}>Advance →</button>
          ) : (
            <span className="subtle" style={{ fontSize: 11 }}>Needs verification</span>
          )
        ) : null}
        {canEditLead(lead, cu) && (
          <button className="btn-sm btn-ghost" onClick={() => actions.onEdit(lead)}>Edit</button>
        )}
        <button className="btn-sm btn-ghost" onClick={() => actions.onManageComments(lead)}>Comments</button>
        {idx >= 1 && (cu.role === "Admin" || (canUpdateStage(cu) && !alreadyDone)) && (
          <button className="btn-sm btn-ghost" onClick={() => actions.onEditStage(lead)}>Edit stage details</button>
        )}
        {canUpdateStage(cu) && !alreadyDone && (
          <button className="btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => actions.onCloseLead(lead)}>Close lead</button>
        )}
      </td>
    </tr>
  );
}
