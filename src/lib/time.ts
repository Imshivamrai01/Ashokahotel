// Single source of truth for the restaurant's wall-clock timezone. Daily revenue,
// "today" boundaries, and the hourly heatmap must all bucket on THIS zone, not the
// server's (Vercel runs UTC) — otherwise orders land in the wrong day/hour.
// Override with APP_TZ env if the venue isn't in India.
export const APP_TZ = process.env.APP_TZ || "Asia/Kolkata";

// Compute timezone offset in minutes for a given instant in `tz` using Intl
export function getTimezoneOffsetMinutes(date: Date, tz: string = APP_TZ): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  const year = getPart("year");
  const month = getPart("month") - 1;
  const day = getPart("day");
  const rawHour = getPart("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = getPart("minute");
  const second = getPart("second");

  const targetUtcMs = Date.UTC(year, month, day, hour, minute, second);
  return Math.round((targetUtcMs - date.getTime()) / 60000);
}

// "YYYY-MM-DD" in the app timezone for a given instant (default: now).
export function todayInTz(tz: string = APP_TZ, at: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(at);
}

// UTC instant for 00:00:00 of the given local day (`YYYY-MM-DD`) in `tz`.
export function startOfDayTz(ymd: string, tz: string = APP_TZ): Date {
  const parts = ymd.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMinutes = getTimezoneOffsetMinutes(approxUtc, tz);
  return new Date(approxUtc.getTime() - offsetMinutes * 60000);
}

// UTC instant for the END of the given local day (23:59:59.999) in `tz`.
export function endOfDayTz(ymd: string, tz: string = APP_TZ): Date {
  const start = startOfDayTz(ymd, tz);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
