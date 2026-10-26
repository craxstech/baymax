import "server-only";

type Level = "debug" | "info" | "warn" | "error";

const sensitiveKeys = new Set([
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "authorization",
  "cookie",
  "email",
  "phone",
  "notes",
  "message",
  "extractedtext",
  "aisummary",
  "address",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        key,
        sensitiveKeys.has(key.toLowerCase()) ? "[redacted]" : redact(item, depth + 1),
      ]),
    );
  }
  return value;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  if (order[level] < (order[configured as Level] ?? 20)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") console.debug(line);
  else console.info(line);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, error: unknown, fields?: Record<string, unknown>) => {
    emit("error", event, {
      ...fields,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  },
};

export function publicErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  logger.error("operation_failed", error);
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return `${fallback} (${error.message})`;
  }
  return fallback;
}
