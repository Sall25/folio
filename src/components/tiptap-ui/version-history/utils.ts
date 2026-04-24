import type { Version } from "./types";

export type VersionGroup = {
  label: string;
  versions: Version[];
};

export function groupVersionsByDate(versions: Version[]): VersionGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: VersionGroup[] = [
    { label: "Today", versions: [] },
    { label: "Yesterday", versions: [] },
    { label: "Last 7 days", versions: [] },
    { label: "Older", versions: [] },
  ];

  for (const version of versions) {
    const date = new Date(Number(version.createdAt));
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (day >= today) groups[0].versions.push(version);
    else if (day >= yesterday) groups[1].versions.push(version);
    else if (day >= lastWeek) groups[2].versions.push(version);
    else groups[3].versions.push(version);
  }

  return groups.filter((g) => g.versions.length > 0);
}

export function formatVersionTime(createdAt: string): string {
  const date = new Date(Number(createdAt));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (day >= today) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(today.getTime() - 86400000);
  if (day >= yesterday) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
