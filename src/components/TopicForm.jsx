import { useState } from "react";

const EXAMPLES = [
  "Latest advances in quantum computing",
  "Impact of AI on healthcare in 2026",
  "Pros and cons of nuclear energy",
  "How does RAG improve LLM accuracy?",
];

export default function TopicForm({ onSubmit, busy }) {
  const [topic, setTopic] = useState("");
  const clean = topic.trim();

  function submit(e) {
    e.preventDefault();
    if (clean && !busy) onSubmit(clean);
  }

  return (
    <form className="topic-form" onSubmit={submit}>
      <div className="input-wrap">
        <span className="input-icon">🔍</span>
        <input
          type="text"
          value={topic}
          maxLength={300}
          autoFocus
          placeholder="Enter a research topic…"
          onChange={(e) => setTopic(e.target.value)}
          disabled={busy}
          aria-label="Research topic"
        />
        <button className="btn btn-primary" type="submit" disabled={!clean || busy}>
          {busy ? <span className="spinner" /> : "Start research"}
        </button>
      </div>
      <div className="chips">
        <span className="chips-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button type="button" className="chip" key={ex} onClick={() => setTopic(ex)} disabled={busy}>
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
