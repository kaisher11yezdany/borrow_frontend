import { STAGES } from "../constants";

export default function Tracker({ idx, extra }) {
  return (
    <div className="tracker">
      {STAGES.map((s, i) => (
        <span key={s} style={{ display: "contents" }}>
          <span className={`dot${i < idx ? " done" : i === idx ? " current" : ""}`} />
          {i < STAGES.length - 1 && <span className={`bar${i < idx ? " done" : ""}`} />}
        </span>
      ))}
      {extra && extra !== "not_applicable" && (
        <>
          <span className="bar done" />
          <span
            className={`dot${extra === "verified" ? " done" : extra === "pending" ? " current" : ""}`}
            style={extra === "rejected" ? { background: "var(--red)" } : undefined}
          />
        </>
      )}
    </div>
  );
}
