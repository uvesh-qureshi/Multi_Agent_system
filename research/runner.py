"""
Runs the same 4-step multi-agent pipeline as pipeline.py, but in a background
thread and reports progress so the React UI can show live status.

pipeline.py / agent.py / tools.py are NOT modified - we just import from agent.py.
"""
import copy
import re
import sys
import threading
import time
import traceback
import uuid

from django.conf import settings

MAX_JOBS = 50  # keep memory small; oldest jobs are dropped

STEP_DEFS = [
    ("search", "Search Agent", "Finding recent & reliable sources"),
    ("reader", "Reader Agent", "Scraping the best source and summarising it"),
    ("writer", "Writer", "Drafting the structured report"),
    ("critic", "Critic", "Reviewing and scoring the report"),
]

JOBS = {}
_LOCK = threading.Lock()


def _text(content):
    """LangChain message content can be a str or a list of blocks - always return str."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)
    return str(content)


def _parse_score(feedback: str):
    m = re.search(r"Score:\s*(\d+(?:\.\d+)?)\s*/\s*10", feedback or "", re.IGNORECASE)
    if not m:
        return None
    return max(0.0, min(10.0, float(m.group(1))))


def _set_step(job, key, state):
    now = time.time()
    with _LOCK:
        for s in job["steps"]:
            if s["key"] == key:
                s["status"] = state
                if state == "running":
                    s["started_at"] = now
                elif state in ("done", "error"):
                    s["finished_at"] = now
        job["current"] = key if state == "running" else job.get("current")


def _run(job_id):
    job = JOBS[job_id]
    topic = job["topic"]
    res = job["results"]

    try:
        agent_dir = str(settings.AGENT_DIR)
        if agent_dir not in sys.path:
            sys.path.insert(0, agent_dir)

        try:
            from agent import (  # noqa: E402  (imported lazily so errors show up in the UI)
                build_reader_agent,
                build_search_agent,
                critic_chain,
                writer_chain,
            )
        except ImportError as imp_err:
            raise RuntimeError(
                f"Could not import agent.py from '{agent_dir}' ({imp_err}). "
                f"Keep the 'ui' folder inside your project folder, or set the AGENT_DIR environment variable."
            ) from imp_err

        job["status"] = "running"

        # Step 1 - Search agent
        _set_step(job, "search", "running")
        search_result = build_search_agent().invoke(
            {"messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]}
        )
        res["search_results"] = _text(search_result["messages"][-1].content)
        _set_step(job, "search", "done")

        # Step 2 - Reader agent
        _set_step(job, "reader", "running")
        reader_result = build_reader_agent().invoke(
            {
                "messages": [
                    (
                        "user",
                        f"Based on the following search results about '{topic}', "
                        f"select the most relevant URL and scrape it using your tool. "
                        f"Then summarize the important information.\n\n"
                        f"Search Results:\n{res['search_results'][:1500]}",
                    )
                ]
            }
        )
        res["scraped_content"] = _text(reader_result["messages"][-1].content)
        _set_step(job, "reader", "done")

        # Step 3 - Writer chain
        _set_step(job, "writer", "running")
        research_combined = (
            f"SEARCH RESULTS:\n{res['search_results']}\n\n"
            f"DETAILED SCRAPED CONTENT:\n{res['scraped_content']}"
        )
        res["report"] = _text(writer_chain.invoke({"topic": topic, "research": research_combined}))
        _set_step(job, "writer", "done")

        # Step 4 - Critic chain
        _set_step(job, "critic", "running")
        res["feedback"] = _text(critic_chain.invoke({"report": res["report"]}))
        res["score"] = _parse_score(res["feedback"])
        _set_step(job, "critic", "done")

        job["status"] = "done"

    except Exception as exc:  # show any failure (missing API key, rate limit...) in the UI
        traceback.print_exc()
        current = job.get("current")
        if current:
            _set_step(job, current, "error")
        job["error"] = f"{type(exc).__name__}: {exc}"
        job["status"] = "error"
    finally:
        job["finished_at"] = time.time()


def start_job(topic: str) -> str:
    job_id = uuid.uuid4().hex[:12]
    job = {
        "id": job_id,
        "topic": topic,
        "status": "queued",
        "current": None,
        "error": None,
        "created_at": time.time(),
        "finished_at": None,
        "steps": [
            {"key": k, "label": label, "hint": hint, "status": "pending", "started_at": None, "finished_at": None}
            for k, label, hint in STEP_DEFS
        ],
        "results": {
            "search_results": "",
            "scraped_content": "",
            "report": "",
            "feedback": "",
            "score": None,
        },
    }
    with _LOCK:
        JOBS[job_id] = job
        while len(JOBS) > MAX_JOBS:
            JOBS.pop(next(iter(JOBS)))
    threading.Thread(target=_run, args=(job_id,), daemon=True).start()
    return job_id


def get_job(job_id: str):
    with _LOCK:
        job = JOBS.get(job_id)
        return copy.deepcopy(job) if job else None
