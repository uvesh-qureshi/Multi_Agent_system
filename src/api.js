const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. Is Django running on port 8000?");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const startResearch = (topic) =>
  request("/research/", { method: "POST", body: JSON.stringify({ topic }) });

export const getJob = (jobId) => request(`/research/${jobId}/`);
