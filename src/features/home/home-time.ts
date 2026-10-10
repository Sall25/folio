import type { TFunction } from "i18next";

// How long ago, the same way everywhere on Home: "12m ago" today,
// "yesterday 18:59", a weekday this week, a date before that.

const DAY = 86_400_000;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function homeWhen(ts: number, t: TFunction, locale?: string): string {
  const today = startOfDay(new Date());
  if (ts >= today) {
    const min = Math.floor((Date.now() - ts) / 60_000);
    if (min < 1) return t("home.time.justNow");
    if (min < 60) return t("home.time.minutesAgo", { count: min });
    return t("home.time.hoursAgo", { count: Math.floor(min / 60) });
  }
  const d = new Date(ts);
  if (ts >= today - DAY) {
    return `${t("home.time.yesterday")} ${d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (ts >= today - 6 * DAY) {
    return d.toLocaleDateString(locale, { weekday: "short" });
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}
