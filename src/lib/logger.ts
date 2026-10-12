type NumericFields = Readonly<Record<string, number>>;

function write(level: "info" | "warn" | "error", event: string, fields?: NumericFields) {
  const entry = {
    level,
    event,
    ...(fields ? { fields } : {}),
  };
  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function logInfo(event: string, fields?: NumericFields) {
  write("info", event, fields);
}

export function logWarning(event: string) {
  write("warn", event);
}

export function logError(event: string, error: unknown) {
  write("error", event, { isError: error instanceof Error ? 1 : 0 });
}
