import type { TFunction } from "i18next";

export function formatRelativeTime(
  dateStr: number | null | undefined,
  t: TFunction,
  locale?: string,
): string {
  if (!dateStr) return "—";
  const date = new Date(Number(dateStr));
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time.justNow");
  if (diffMin < 60) return t("time.minutesAgo", { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("time.hoursAgo", { count: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return t("time.yesterday");
  if (diffD < 7) return t("time.daysAgo", { count: diffD });
  return date.toLocaleDateString(locale);
}
