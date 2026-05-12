import { useState } from "react";
import { EMOJI_CATEGORIES, CALLOUT_COLORS } from "./config";
import type { CalloutColor } from "./types";

interface EmojiPickerProps {
  currentEmoji: string;
  currentColor: CalloutColor;
  onEmojiSelect: (emoji: string) => void;
  onColorSelect: (color: CalloutColor) => void;
}

export function EmojiPicker({
  currentEmoji,
  currentColor,
  onEmojiSelect,
  onColorSelect,
}: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"emoji" | "color">("emoji");

  const filteredCategories = search.trim()
    ? [
        {
          label: "Results",
          emojis: EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) =>
            // Simple substring match on the emoji itself
            e.includes(search),
          ),
        },
      ]
    : EMOJI_CATEGORIES;

  return (
    <div className="ep-root" onMouseDown={(e) => e.preventDefault()}>
      {/* ── Tabs ── */}
      <div className="ep-tabs">
        <button
          className={`ep-tab ${tab === "emoji" ? "ep-tab--active" : ""}`}
          onClick={() => setTab("emoji")}
        >
          Emoji
        </button>
        <button
          className={`ep-tab ${tab === "color" ? "ep-tab--active" : ""}`}
          onClick={() => setTab("color")}
        >
          Color
        </button>
      </div>

      {tab === "emoji" && (
        <>
          {/* Search */}
          <div className="ep-search-wrap">
            <input
              className="ep-search"
              placeholder="Filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Current */}
          <div className="ep-current-wrap">
            <button
              className="ep-current"
              onClick={() => onEmojiSelect(currentEmoji)}
            >
              {currentEmoji}
            </button>
          </div>

          {/* Categories */}
          <div className="ep-scroll">
            {filteredCategories.map((cat) => (
              <div key={cat.label}>
                <p className="ep-cat-label">{cat.label}</p>
                <div className="ep-grid">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      className={`ep-emoji-btn ${emoji === currentEmoji ? "ep-emoji-btn--active" : ""}`}
                      onClick={() => onEmojiSelect(emoji)}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.every((c) => c.emojis.length === 0) && (
              <p className="ep-no-results">No emojis found</p>
            )}
          </div>
        </>
      )}

      {tab === "color" && (
        <div className="ep-color-grid">
          {CALLOUT_COLORS.map((c) => (
            <button
              key={c.id}
              className={`ep-color-btn ${c.id === currentColor ? "ep-color-btn--active" : ""}`}
              onClick={() => onColorSelect(c.id)}
              title={c.label}
            >
              <span
                className="ep-color-swatch"
                style={{
                  background: c.theme.bg,
                  border: `1.5px solid ${c.theme.border}`,
                }}
              />
              <span className="ep-color-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
