// backend/src/utils/monthKey.ts

/**
 * monthKey format: "YYYY-MM" (e.g. "2026-01")
 * Returns [start, end) range.
 */
export function monthKeyToRange(monthKey: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) {
    throw new Error("Invalid monthKey. Expected format YYYY-MM (e.g. 2026-01)");
  }

  const year = Number(m[1]);
  const month = Number(m[2]); // 01..12

  if (month < 1 || month > 12) {
    throw new Error("Invalid month in monthKey. Expected 01..12");
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export function safeZipName(name: string) {
  return (name || "file").replace(/[\\/:*?"<>|]+/g, "-").trim();
}

