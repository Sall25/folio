const PLACEHOLDER_COLORS = [
  "var(--tt-color-highlight-yellow-contrast)",
  "var(--tt-color-highlight-blue-contrast)",
  "var(--tt-color-highlight-green-contrast)",
  "var(--tt-color-highlight-purple-contrast)",
  "var(--tt-color-highlight-pink-contrast)",
  "var(--tt-color-highlight-brown-contrast)",
  "var(--tt-color-highlight-orange-contrast)",
  "var(--tt-color-highlight-red-contrast)",
];

export function getPlaceholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}
