import { useRef } from "react";
import { OPERATORS_BY_TYPE, defaultOperatorFor } from "../utils/filterEngine";

// Per-field AND/OR filter builder: each row is (field, operator, value);
// when more than one row exists, a single AND/OR toggle joins all of them.
export default function FilterBuilder({ fieldsConfig, conditions, setConditions, joinMode, setJoinMode }) {
  const nextId = useRef(1);
  const fieldKeys = Object.keys(fieldsConfig);

  function addCondition() {
    const field = fieldKeys[0];
    setConditions((prev) => [
      ...prev,
      { id: nextId.current++, field, operator: defaultOperatorFor(fieldsConfig[field].type), value: "" },
    ]);
  }
  function updateCondition(id, patch) {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCondition(id) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }
  function clearAll() {
    setConditions([]);
  }

  function onFieldChange(cond, newField) {
    const type = fieldsConfig[newField].type;
    updateCondition(cond.id, { field: newField, operator: defaultOperatorFor(type), value: "" });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {conditions.length === 0 ? (
        <p className="subtle" style={{ margin: 0 }}>No filters applied.</p>
      ) : (
        conditions.map((cond, idx) => {
          const field = fieldsConfig[cond.field];
          const operators = OPERATORS_BY_TYPE[field.type] || [];
          return (
            <div key={cond.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: idx < conditions.length - 1 ? 8 : 0 }}>
              {idx > 0 && (
                <span className="badge gray" style={{ minWidth: 32, textAlign: "center" }}>{joinMode}</span>
              )}
              <select style={{ width: "auto", minWidth: 140 }} value={cond.field} onChange={(e) => onFieldChange(cond, e.target.value)}>
                {fieldKeys.map((k) => (
                  <option key={k} value={k}>{fieldsConfig[k].label}</option>
                ))}
              </select>
              <select style={{ width: "auto", minWidth: 110 }} value={cond.operator} onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}>
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {field.type === "select" ? (
                <select style={{ width: "auto", minWidth: 160 }} value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })}>
                  <option value="">Select...</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === "date" ? (
                <input type="date" style={{ width: "auto" }} value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} />
              ) : (
                <input style={{ width: "auto", minWidth: 160 }} value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} placeholder="Value" />
              )}
              <button type="button" className="btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => removeCondition(cond.id)}>Remove</button>
            </div>
          );
        })
      )}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: conditions.length ? 12 : 8 }}>
        <button type="button" className="btn-sm" onClick={addCondition}>+ Add filter</button>
        {conditions.length > 1 && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400, width: "auto", fontSize: 12 }}>
            Match:
            <span style={{ display: "flex", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="radio" style={{ width: "auto" }} checked={joinMode === "AND"} onChange={() => setJoinMode("AND")} /> All (AND)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="radio" style={{ width: "auto" }} checked={joinMode === "OR"} onChange={() => setJoinMode("OR")} /> Any (OR)
              </span>
            </span>
          </label>
        )}
        {conditions.length > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
        )}
      </div>
    </div>
  );
}
