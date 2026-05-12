import type { CalloutColor, CalloutColorConfig } from "./types";

/**
 *  --tt-color-highlight-yellow: #fef9c3;
  --tt-color-highlight-green: #b5f6cc;
  --tt-color-highlight-blue: #bde1fa;
  --tt-color-highlight-purple: #e0c6fb;
  --tt-color-highlight-red: #fba1a8;
  --tt-color-highlight-gray: rgb(248, 248, 247);
  --tt-color-highlight-brown: rgb(246, 223, 223);
  --tt-color-highlight-orange: rgb(252, 220, 189);
  --tt-color-highlight-pink: rgb(255, 207, 229);
 */
export const CALLOUT_COLORS: CalloutColorConfig[] = [
  {
    id: "gray",
    label: "Gray",
    theme: {
      bg: "var(--tt-color-highlight-gray)",
      border: "var(--tt-color-highlight-gray-contrast",
    },
  },
  {
    id: "brown",
    label: "Brown",
    theme: {
      bg: "var(--tt-color-highlight-brown)",
      border: "var(--tt-color-highlight-brown-contrast",
    },
  },
  {
    id: "orange",
    label: "Orange",
    theme: {
      bg: "var(--tt-color-highlight-orange)",
      border: "var(--tt-color-highlight-orange-contrast",
    },
  },
  {
    id: "yellow",
    label: "Yellow",
    theme: {
      bg: "var(--tt-color-highlight-yellow)",
      border: "var(--tt-color-highlight-yellow-contrast",
    },
  },
  {
    id: "green",
    label: "Green",
    theme: {
      bg: "var(--tt-color-highlight-green)",
      border: "var(--tt-color-highlight-green-contrast",
    },
  },
  {
    id: "blue",
    label: "Blue",
    theme: {
      bg: "var(--tt-color-highlight-blue)",
      border: "var(--tt-color-highlight-blue-contrast",
    },
  },
  {
    id: "purple",
    label: "Purple",
    theme: {
      bg: "var(--tt-color-highlight-purple)",
      border: "var(--tt-color-highlight-purple-contrast",
    },
  },
  {
    id: "pink",
    label: "Pink",
    theme: {
      bg: "var(--tt-color-highlight-pink)",
      border: "var(--tt-color-highlight-pink-contrast",
    },
  },
  {
    id: "red",
    label: "Red",
    theme: {
      bg: "var(--tt-color-highlight-red)",
      border: "var(--tt-color-highlight-red-contrast",
    },
  },
];

export const CALLOUT_COLOR_MAP = new Map(CALLOUT_COLORS.map((c) => [c.id, c]));

export function getCalloutColor(id: CalloutColor): CalloutColorConfig {
  return CALLOUT_COLOR_MAP.get(id) ?? CALLOUT_COLORS[0];
}

export const DEFAULT_EMOJI = "💡";
export const DEFAULT_COLOR: CalloutColor = "gray";

// Emoji categories for the picker
export const EMOJI_CATEGORIES = [
  {
    label: "Commonly used",
    emojis: [
      "💡",
      "📌",
      "⚠️",
      "✅",
      "❌",
      "🔥",
      "💬",
      "📝",
      "🎯",
      "🚀",
      "💎",
      "🔑",
      "📢",
      "🛠️",
      "🧠",
      "💻",
      "📊",
      "🎉",
      "⭐",
      "🌟",
    ],
  },
  {
    label: "Symbols",
    emojis: [
      "✨",
      "⚡",
      "🔔",
      "🔕",
      "💯",
      "🔒",
      "🔓",
      "♻️",
      "🔄",
      "➡️",
      "⬅️",
      "⬆️",
      "⬇️",
      "🔺",
      "🔻",
      "▶️",
      "⏸️",
      "⏹️",
      "🔘",
      "🔵",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "📚",
      "📖",
      "📄",
      "📋",
      "📎",
      "🖇️",
      "✂️",
      "🗂️",
      "🗃️",
      "📥",
      "📤",
      "📦",
      "🏷️",
      "🔍",
      "🔎",
      "🔧",
      "🔨",
      "⚙️",
      "🧪",
      "🧲",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌱",
      "🌿",
      "🍃",
      "🌸",
      "🌺",
      "🌻",
      "🌙",
      "☀️",
      "⛅",
      "🌈",
      "🌊",
      "🔥",
      "💧",
      "❄️",
      "🌴",
      "🍀",
      "🌵",
      "🦋",
      "🐝",
      "🌾",
    ],
  },
  {
    label: "People",
    emojis: [
      "👋",
      "👍",
      "👎",
      "👏",
      "🙌",
      "🤝",
      "💪",
      "🙏",
      "🤔",
      "😊",
      "😢",
      "😂",
      "🥳",
      "😍",
      "🤩",
      "😎",
      "🧐",
      "🤯",
      "😅",
      "😴",
    ],
  },
];
