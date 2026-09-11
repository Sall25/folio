export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function isoToMonthDay(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}
