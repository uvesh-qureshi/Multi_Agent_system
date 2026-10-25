import { useState } from "react";
import Markdown from "./Markdown.jsx";
import ScoreRing from "./ScoreRing.jsx";

const TABS = [
  { key: "report", label: "📄 Report" },
  { key: "feedback", label: "🧐 Critic" },
  { key: "search_results", label: "🔎 Sources" },
  { key: "scraped_content", label: "📖 Scraped" },
];

function slug(text) {
  return (text || "research").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "research";
}

export default function Results({ job }) {
  const { results, topic } = job;
  const [picked, setPicked] = useState(null);
  const [copied, setCopied] = useState(false);

  const available = TABS.filter((t) => (results[t.key] || "").trim());
  const current = available.find((t) => t.key === picked) || available[0];
  if (!current) return null;
  const content = results[current.key];

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(topic)}-${current.key}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card results">
      <div className="results-head">
        <div className="tabs" role="tablist">
          {TABS.map((t) => {
            const enabled = available.some((a) => a.key === t.key);
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={current.key === t.key}
                className={`tab ${current.key === t.key ? "active" : ""}`}
                disabled={!enabled}
                onClick={() => setPicked(t.key)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="results-actions">
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={download}>
            Download .md
          </button>
        </div>
      </div>

      {current.key === "feedback" && typeof results.score === "number" && (
        <div className="score-row">
          <ScoreRing score={results.score} />
          <div>
            <div className="label">Critic score</div>
            <div className="score-note">Automatic review of the generated report</div>
          </div>
        </div>
      )}

      <article className="results-body">
        <Markdown>{content}</Markdown>
      </article>
    </div>
  );
}
