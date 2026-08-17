// Order here is display/org-chart order only — NOT a seniority/permission
// inheritance order. Sales Manager sits above Team Lead but has fewer
// permissions than Team Lead below it, so nothing may derive access from
// array position — every capability below is its own explicit allow-list,
// mirroring server/src/utils/permissions.js exactly. This is UI convenience
// only (hiding buttons a role can't use); the server re-checks everything.
export const ROLES = ["Admin", "Backend", "Branch Manager", "Sales Manager", "Team Lead", "RM", "Referral Partner"];
export const STAGES = ["Lead Added", "Lead Contacted", "Login Done", "Sanction Done", "Disbursement Done"];

const CAN_VERIFY = new Set(["Admin", "Backend", "Branch Manager", "Team Lead"]);
const CAN_VERIFY_ACTIONS = new Set(["Admin", "Branch Manager", "Team Lead"]);
const CAN_UPDATE_STAGE = new Set(["Admin", "Backend", "Branch Manager", "Sales Manager", "Team Lead", "RM"]);
const CAN_MANAGE_ACCOUNTING = new Set(["Admin", "Branch Manager"]);
const CAN_SEE_MARGIN = new Set(["Admin", "Backend", "Branch Manager", "Team Lead"]);
const CAN_MANAGE_SETTINGS = new Set(["Admin", "Branch Manager"]);
const CAN_MANAGE_TEAM_MEMBERS = new Set(["Admin", "Branch Manager"]);
const CAN_VIEW_TEAM_HIERARCHY = new Set(["Admin", "Branch Manager", "Team Lead", "RM"]);
const CAN_MANAGE_HIERARCHY = new Set(["Admin"]);
const CAN_EXPORT_DATA = new Set(["Admin"]);

export function canVerify(user) {
  return CAN_VERIFY.has(user.role);
}
export function canVerifyActions(user) {
  return CAN_VERIFY_ACTIONS.has(user.role);
}
export function canUpdateStage(user) {
  return CAN_UPDATE_STAGE.has(user.role);
}
export function canManageAccounting(user) {
  return CAN_MANAGE_ACCOUNTING.has(user.role);
}
export function canSeeMargin(user) {
  return CAN_SEE_MARGIN.has(user.role);
}
export function canManageSettings(user) {
  return CAN_MANAGE_SETTINGS.has(user.role);
}
export function canManageTeamMembers(user) {
  return CAN_MANAGE_TEAM_MEMBERS.has(user.role);
}
export function canViewTeamHierarchy(user) {
  return CAN_VIEW_TEAM_HIERARCHY.has(user.role);
}
export function canManageHierarchy(user) {
  return CAN_MANAGE_HIERARCHY.has(user.role);
}
export function canExportData(user) {
  return CAN_EXPORT_DATA.has(user.role);
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
