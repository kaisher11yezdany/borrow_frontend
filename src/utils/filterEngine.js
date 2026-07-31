// Small AND/OR filter-condition engine shared by any table that wants a
// per-field filter builder (currently the Verification queue tabs).

export const OPERATORS_BY_TYPE = {
  text: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "does not equal" },
  ],
  select: [
    { value: "is", label: "is" },
    { value: "isNot", label: "is not" },
  ],
  date: [
    { value: "on", label: "on" },
    { value: "before", label: "before" },
    { value: "after", label: "after" },
  ],
};

export function defaultOperatorFor(type) {
  return OPERATORS_BY_TYPE[type]?.[0]?.value || "contains";
}

function evaluateCondition(lead, condition, fieldsConfig) {
  const field = fieldsConfig[condition.field];
  if (!field || condition.value === undefined || condition.value === "") return true;
  const rawValue = field.getValue(lead);

  if (field.type === "date") {
    if (!rawValue) return false;
    const leadDate = new Date(rawValue);
    const target = new Date(condition.value);
    leadDate.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    if (condition.operator === "before") return leadDate < target;
    if (condition.operator === "after") return leadDate > target;
    return leadDate.getTime() === target.getTime();
  }

  if (field.type === "select") {
    return condition.operator === "isNot" ? rawValue !== condition.value : rawValue === condition.value;
  }

  // text
  const v = (rawValue || "").toString().toLowerCase();
  const t = condition.value.toLowerCase();
  if (condition.operator === "equals") return v === t;
  if (condition.operator === "notEquals") return v !== t;
  return v.includes(t);
}

export function evaluateConditions(lead, conditions, joinMode, fieldsConfig) {
  const active = (conditions || []).filter((c) => c.value !== undefined && c.value !== "");
  if (active.length === 0) return true;
  return joinMode === "OR"
    ? active.some((c) => evaluateCondition(lead, c, fieldsConfig))
    : active.every((c) => evaluateCondition(lead, c, fieldsConfig));
}
