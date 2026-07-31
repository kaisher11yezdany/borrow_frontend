export function installmentsTotal(entry) {
  return (entry?.installments || []).reduce((s, i) => s + Number(i.amount || 0), 0);
}
export function entryBalance(entry) {
  return (entry?.expectedAmount || 0) - installmentsTotal(entry);
}
export function entryStatusLabel(entry, doneLabel) {
  const total = installmentsTotal(entry);
  if (total <= 0) return entry?.invoiceRaised ? "Invoice Sent" : "Pending";
  if (total < (entry?.expectedAmount || 0)) return "Partially " + doneLabel;
  return doneLabel;
}
export function latestInstallmentDate(entry) {
  const dates = (entry?.installments || []).map((i) => new Date(i.date).getTime()).filter(Boolean);
  return dates.length ? Math.max(...dates) : null;
}
export function totalExpensesOf(expenses) {
  return (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
}
