const PLACEHOLDER_COLORS = [
  "#dbe9f4", // light blue
  "#fde8d8", // light orange
  "#e8f5e9", // light green
  "#f3e5f5", // light purple
  "#fff8e1", // light yellow
  "#fce4ec", // light pink
  "#e0f7fa", // light cyan
  "#f1f8e9", // light lime
];

export function getPlaceholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}
