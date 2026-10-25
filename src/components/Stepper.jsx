const ICONS = { search: "🔎", reader: "📖", writer: "✍️", critic: "🧐" };

function duration(step) {
  if (!step.started_at || !step.finished_at) return "";
  return `${Math.max(1, Math.round(step.finished_at - step.started_at))}s`;
}

export default function Stepper({ steps }) {
  return (
    <ol className="stepper">
      {steps.map((step, i) => (
        <li key={step.key} className={`step step-${step.status}`}>
          <div className="step-dot">
            {step.status === "running" ? (
              <span className="spinner" />
            ) : step.status === "done" ? (
              "✓"
            ) : step.status === "error" ? (
              "✕"
            ) : (
              i + 1
            )}
          </div>
          <div className="step-body">
            <div className="step-title">
              <span>
                {ICONS[step.key]} {step.label}
              </span>
              <span className="step-time">{duration(step)}</span>
            </div>
            <div className="step-hint">
              {step.status === "running"
                ? "Working…"
                : step.status === "done"
                ? "Completed"
                : step.status === "error"
                ? "Failed"
                : step.hint}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
