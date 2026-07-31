export const ROLES = ["Admin", "Manager", "Team Lead", "Sales Manager", "Referral Partner"];
export const STAGES = ["Lead Added", "Lead Contacted", "Login Done", "Sanction Done", "Disbursement Done"];

export function rank(role) {
  return ROLES.indexOf(role);
}
export function canVerify(user) {
  return rank(user.role) <= rank("Team Lead");
}
export function canUpdateStage(user) {
  return rank(user.role) <= rank("Sales Manager");
}
export function canManageAccounting(user) {
  return rank(user.role) <= rank("Manager");
}
export function canManageTeam(user) {
  return user.role === "Admin";
}
export function canSeeMargin(user) {
  return rank(user.role) <= rank("Team Lead");
}
export function isClosed(lead) {
  return lead.closure && lead.closure.status !== "open";
}
export function canEditLead(lead, user) {
  if (user.role === "Admin") return true;
  if (isClosed(lead)) return false;
  return lead.verification.status !== "verified";
}

export function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
export function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Shared label/color mapping for verification.status and finalVerification.status
// values, used by badges and the verification-history popup alike.
export const VERIFICATION_STATUS_LABELS = {
  verified: { label: "Approved", cls: "green" },
  rejected: { label: "Rejected", cls: "red" },
  duplicate_flag: { label: "Possible duplicate", cls: "red" },
  pending: { label: "Pending review", cls: "amber" },
  draft: { label: "Draft — not yet submitted", cls: "gray" },
  not_applicable: { label: "Not applicable", cls: "gray" },
};
export function verificationStatusInfo(status) {
  return VERIFICATION_STATUS_LABELS[status] || { label: status, cls: "gray" };
}
