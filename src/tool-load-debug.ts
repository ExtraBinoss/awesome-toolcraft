type LoadEvent = {
  elapsedMs: number;
  label: string;
};

const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
const events: LoadEvent[] = [];

declare global {
  interface Window {
    __toolcraftLoadDebug?: () => void;
  }
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  let storedValue = false;
  try {
    storedValue = window.localStorage.getItem("toolcraft:debug:load") === "true";
  } catch {
    // Ignore storage restrictions; dev mode and the query flag still work.
  }
  return import.meta.env.DEV || params.get("debug") === "load" || storedValue;
}

export function logToolLoad(label: string): void {
  if (!isEnabled()) return;
  const elapsedMs = performance.now() - startedAt;
  events.push({ elapsedMs, label });
  performance.mark(`toolcraft-load:${label}`);
  console.log(`[Toolcraft load] ${label}: ${elapsedMs.toFixed(1)}ms`);
}

export function logToolLoadDuration(label: string, startedAtMs: number): void {
  if (!isEnabled()) return;
  logToolLoad(`${label} (${(performance.now() - startedAtMs).toFixed(1)}ms)`);
}

export function printToolLoadSummary(): void {
  if (!isEnabled()) return;
  console.groupCollapsed("[Toolcraft load] timeline");
  console.table(events);
  console.groupEnd();
}

if (typeof window !== "undefined") {
  window.__toolcraftLoadDebug = printToolLoadSummary;
}
