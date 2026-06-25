import type { GradientPreset } from "./types";

export const GRADIENT_PRESETS: GradientPreset[] = [
  { label: "Red", value: "linear-gradient(135deg, #e8504a 0%, #e8504a 100%)" },
  {
    label: "Amber",
    value: "linear-gradient(135deg, #f5a623 0%, #f5a623 100%)",
  },
  { label: "Sky", value: "linear-gradient(135deg, #2baae2 0%, #2baae2 100%)" },
  {
    label: "Cream",
    value: "linear-gradient(135deg, #fdf3e7 0%, #fdf3e7 100%)",
  },
  { label: "Teal", value: "linear-gradient(135deg, #5ecfcc 0%, #4ab8d8 100%)" },
  { label: "Pink", value: "linear-gradient(135deg, #f72585 0%, #e8304a 100%)" },
  {
    label: "Sunset",
    value: "linear-gradient(135deg, #e85d3a 0%, #e83030 100%)",
  },
  { label: "Soft", value: "linear-gradient(135deg, #e8d5f5 0%, #c4d8f0 100%)" },
  { label: "Dusk", value: "linear-gradient(135deg, #e07b6a 0%, #7b8fd4 100%)" },
  {
    label: "Violet",
    value: "linear-gradient(135deg, #9b59b6 0%, #e91e8c 100%)",
  },
  {
    label: "Ocean",
    value: "linear-gradient(135deg, #4a90d9 0%, #5bb8c9 100%)",
  },
  {
    label: "Slate",
    value: "linear-gradient(135deg, #434343 0%, #000000 100%)",
  },
  {
    label: "Aurora",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    label: "Candy",
    value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  { label: "Aqua", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "Mint", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  {
    label: "Flamingo",
    value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    label: "Lavender",
    value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    label: "Blush",
    value: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  },
  {
    label: "Peach",
    value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  },
  {
    label: "Midnight",
    value: "linear-gradient(135deg, #2d3561 0%, #c05c7e 100%)",
  },
  {
    label: "Abyss",
    value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  },
  { label: "Gold", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  {
    label: "Emerald",
    value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  },
  {
    label: "Inferno",
    value: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
  },
  {
    label: "Cosmos",
    value: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  },
  { label: "Haze", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)" },
  { label: "Sage", value: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)" },
  {
    label: "Ember",
    value: "linear-gradient(135deg, #fd746c 0%, #ff9068 100%)",
  },
  {
    label: "Cobalt",
    value: "linear-gradient(135deg, #3d5af1 0%, #0ec9f1 100%)",
  },
  {
    label: "Merlot",
    value: "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
  },
  {
    label: "Steel",
    value: "linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)",
  },

  // ── Highlight palette — uniform with --tt-color-highlight-* (theme-aware) ──
  // Same color both stops so the cover matches the highlight token exactly.
  {
    label: "Highlight gray",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-gray) 0%, var(--tt-color-highlight-gray) 100%)",
  },
  {
    label: "Highlight brown",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-brown) 0%, var(--tt-color-highlight-brown) 100%)",
  },
  {
    label: "Highlight orange",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-orange) 0%, var(--tt-color-highlight-orange) 100%)",
  },
  {
    label: "Highlight yellow",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-yellow) 0%, var(--tt-color-highlight-yellow) 100%)",
  },
  {
    label: "Highlight lime",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-lime) 0%, var(--tt-color-highlight-lime) 100%)",
  },
  {
    label: "Highlight green",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-green) 0%, var(--tt-color-highlight-green) 100%)",
  },
  {
    label: "Highlight mint",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-mint) 0%, var(--tt-color-highlight-mint) 100%)",
  },
  {
    label: "Highlight teal",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-teal) 0%, var(--tt-color-highlight-teal) 100%)",
  },
  {
    label: "Highlight cyan",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-cyan) 0%, var(--tt-color-highlight-cyan) 100%)",
  },
  {
    label: "Highlight blue",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-blue) 0%, var(--tt-color-highlight-blue) 100%)",
  },
  {
    label: "Highlight slate",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-slate) 0%, var(--tt-color-highlight-slate) 100%)",
  },
  {
    label: "Highlight indigo",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-indigo) 0%, var(--tt-color-highlight-indigo) 100%)",
  },
  {
    label: "Highlight purple",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-purple) 0%, var(--tt-color-highlight-purple) 100%)",
  },
  {
    label: "Highlight violet",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-violet) 0%, var(--tt-color-highlight-violet) 100%)",
  },
  {
    label: "Highlight magenta",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-magenta) 0%, var(--tt-color-highlight-magenta) 100%)",
  },
  {
    label: "Highlight pink",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-pink) 0%, var(--tt-color-highlight-pink) 100%)",
  },
  {
    label: "Highlight rose",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-rose) 0%, var(--tt-color-highlight-rose) 100%)",
  },
  {
    label: "Highlight red",
    value:
      "linear-gradient(135deg, var(--tt-color-highlight-red) 0%, var(--tt-color-highlight-red) 100%)",
  },
];