import { API } from "@/lib/apiClient";

/**
 * POST to an SSE endpoint and yield parsed events (JSON per `data: {...}\n\n`).
 * Sends cookies (credentials: include). Aborts on unmount via passed AbortController.
 */
export async function* streamSSE(path, body, { signal } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let err = "";
    try { err = await res.text(); } catch {}
    yield { type: "error", error: err || `HTTP ${res.status}` };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try { yield JSON.parse(payload); } catch { /* ignore malformed */ }
    }
  }
}
