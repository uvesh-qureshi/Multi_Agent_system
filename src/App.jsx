import { useEffect, useRef, useState } from "react";
import { getJob, startResearch } from "./api";
import TopicForm from "./components/TopicForm.jsx";
import Stepper from "./components/Stepper.jsx";
import Results from "./components/Results.jsx";

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 5;

function readTheme() {
  try {
    return localStorage.getItem("theme") || "dark";
  } catch {
    return "dark";
  }
}

export default function App() {
  const [theme, setTheme] = useState(readTheme);
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const failures = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* storage blocked - ignore */
    }
  }, [theme]);

  const jobId = job?.id;
  const active = !!job && (job.status === "queued" || job.status === "running");

  // Poll the Django API while the pipeline is running.
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const next = await getJob(jobId);
        failures.current = 0;
        if (!cancelled) setJob(next);
      } catch (e) {
        failures.current += 1;
        const lost = /not found/i.test(e.message);
        if (!cancelled && (lost || failures.current >= MAX_POLL_FAILURES)) {
          setJob((prev) => (prev ? { ...prev, status: "error", error: e.message } : prev));
        }
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, active]);

  // Live stopwatch.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(timer);
  }, [active]);

  async function handleStart(topic) {
    setError("");
    setSubmitting(true);
    try {
      const { job_id } = await startResearch(topic);
      startedAt.current = Date.now();
      failures.current = 0;
      setElapsed(0);
      setJob(await getJob(job_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setJob(null);
    setError("");
  }

  const totalSeconds =
    job && job.finished_at && job.created_at ? Math.round(job.finished_at - job.created_at) : elapsed;
  const hasResults = !!job && Object.values(job.results).some((v) => typeof v === "string" && v.trim());

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">🔬</span>
          <div>
            <div className="brand-name">Research Agent</div>
            <div className="brand-sub">Multi-agent research system</div>
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle light / dark theme"
          title="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="container">
        {!job && (
          <section className="hero">
            <span className="pill">Search → Read → Write → Review</span>
            <h1>
              Research any topic with a <span className="gradient-text">team of AI agents</span>
            </h1>
            <p className="hero-sub">
              Enter a topic. Four agents search the web, read the best source, write a structured report and score it.
            </p>
            <TopicForm onSubmit={handleStart} busy={submitting} />
            {error && <div className="alert alert-error">{error}</div>}

            <div className="feature-grid">
              {[
                ["🔎", "Search Agent", "Finds recent, reliable sources with Tavily"],
                ["📖", "Reader Agent", "Scrapes the most relevant page and summarises it"],
                ["✍️", "Writer", "Drafts Introduction, Key Findings, Conclusion, Sources"],
                ["🧐", "Critic", "Scores the report out of 10 with improvements"],
              ].map(([icon, title, text]) => (
                <div className="feature" key={title}>
                  <div className="feature-icon">{icon}</div>
                  <div className="feature-title">{title}</div>
                  <div className="feature-text">{text}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {job && (
          <section className="workspace">
            <div className="topic-bar">
              <div className="topic-meta">
                <span className="label">Research topic</span>
                <h2>{job.topic}</h2>
              </div>
              <div className="topic-actions">
                <span className={`timer ${active ? "live" : ""}`}>⏱ {formatTime(totalSeconds)}</span>
                <button className="btn btn-ghost" onClick={reset}>
                  New research
                </button>
              </div>
            </div>

            <div className="layout">
              <aside className="card side">
                <h3 className="card-title">Pipeline</h3>
                <Stepper steps={job.steps} status={job.status} />
                {job.status === "done" && <div className="alert alert-ok">Research complete in {formatTime(totalSeconds)}</div>}
                {job.status === "error" && (
                  <div className="alert alert-error">
                    <strong>Pipeline failed.</strong>
                    <span>{job.error}</span>
                    <small>Check the Django terminal for the full traceback (API keys in .env?).</small>
                  </div>
                )}
              </aside>

              <section className="main-col">
                {hasResults ? (
                  <Results job={job} />
                ) : (
                  <div className="card placeholder">
                    <div className="spinner big" />
                    <p>Agents are working… results will appear here as soon as each step finishes.</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">Built with Django · React · LangChain</footer>
    </div>
  );
}

function formatTime(total) {
  const s = Math.max(0, total || 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
