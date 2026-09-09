const prefix = (level) => `[${new Date().toISOString()}] [${level}]`;

// Optional listeners, e.g. the web UI streams backend logs per indexing job.
// Additive only — console output behaviour is unchanged.
const listeners = new Set();

export function addLogListener(fn) {
  listeners.add(fn);
  return () => removeLogListener(fn);
}

export function removeLogListener(fn) {
  listeners.delete(fn);
}

const emit = (level, args) => {
  if (listeners.size === 0) return;
  const text = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  for (const fn of listeners) {
    try {
      fn({ level, text, at: new Date().toISOString() });
    } catch {
      // Listener errors must never break indexing.
    }
  }
};

export const logger = {
  info: (...args) => {
    console.log(prefix("info"), ...args);
    emit("info", args);
  },
  warn: (...args) => {
    console.warn(prefix("warn"), ...args);
    emit("warn", args);
  },
  error: (...args) => {
    console.error(prefix("error"), ...args);
    emit("error", args);
  },
};
