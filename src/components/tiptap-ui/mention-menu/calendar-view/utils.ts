export const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Date[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, daysInPrev - i));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }
  return cells;
}

export function formatDate(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export const parseTime = (
  input: string,
): { hours: number; minutes: number } | null => {
  // match formats like "2:30 PM", "14:30", "2:30pm", "230pm", "2pm"
  const normalized = input.trim().toUpperCase();

  const match12 = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2] ?? "0");
    const period = match12[3];
    if (hours === 12) hours = period === "AM" ? 0 : 12;
    else if (period === "PM") hours += 12;
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  if (match24) {
    const hours = parseInt(match24[1]);
    const minutes = parseInt(match24[2]);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
};
