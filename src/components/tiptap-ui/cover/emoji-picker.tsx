import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Apple,
  Clock,
  Dumbbell,
  Flag,
  Hash,
  Leaf,
  Lightbulb,
  Plane,
  Shuffle,
  Smile,
  type LucideIcon,
} from "lucide-react";
import {
  EMOJI_CATEGORIES,
  SKIN_TONES,
  withSkin,
  type EmojiRecord,
} from "./data/emoji-data";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { RecentIconRow } from "src/components/tiptap-templates/simple/components/recent-icon-row";
import { useIconRecents } from "src/components/tiptap-templates/simple/hooks/use-icon-recents";
import {
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

// Maps the `icon` string on each category (see emoji-data.ts) to a component
// for the bottom nav. Small, static, eager — no namespace pulled in.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Smile,
  Leaf,
  Apple,
  Dumbbell,
  Plane,
  Lightbulb,
  Hash,
  Flag,
};

const COLS = 9;

export function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [query, setQuery] = useState("");
  const [tone, setTone] = useState(0); // 0 = default skin tone
  const [showTones, setShowTones] = useState(false);

  const deferred = useDeferredValue(query);
  const q = deferred.trim().toLowerCase();

  // When searching, collapse to a single flat result set; otherwise render the
  // category sections as-is.
  const results = useMemo(() => {
    if (!q) return null;
    const out: EmojiRecord[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const rec of cat.emojis) {
        if (rec.search.includes(q)) out.push(rec);
      }
    }
    return out;
  }, [q]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pick = (rec: EmojiRecord) => onSelect(withSkin(rec, tone));

  const shuffle = () => {
    const cat =
      EMOJI_CATEGORIES[Math.floor(Math.random() * EMOJI_CATEGORIES.length)];
    const rec = cat.emojis[Math.floor(Math.random() * cat.emojis.length)];
    pick(rec);
  };

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ block: "start" });
  };
  const scrollTop = () => {
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const { recents } = useIconRecents();

  const iconBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 30,
    width: 30,
    borderRadius: 6,
    border: "1px solid var(--tt-border-color)",
    background: "var(--tt-theme-bg)",
    color: "var(--tt-text-color)",
    cursor: "pointer",
    flexShrink: 0,
  };

  const renderGrid = (recs: readonly EmojiRecord[]) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
      }}
    >
      {recs.map((rec) => (
        <button
          key={rec.id}
          type="button"
          className="emoji-cell"
          title={rec.name}
          onClick={() => pick(rec)}
        >
          {withSkin(rec, tone)}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ width: "100%", paddingTop: 10 }}>
      <style>{`
        .emoji-cell {
          appearance: none;
          border: none;
          background: transparent;
          padding: 0;
          height: 34px;
          font-size: 22px;
          line-height: 1;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .emoji-cell:hover { background: var(--tt-hover-color, rgba(127,127,127,0.15)); }
        .emoji-cat-label {
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          color: var(--tt-text-secondary, #9ca3af);
          padding: 6px 2px 4px;
          margin-bottom: 5px;
        }
        .emoji-nav-btn {
          appearance: none;
          border: none;
          background: transparent;
          color: var(--tt-theme-muted, #9ca3af);
          height: 32px;
          width: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          cursor: pointer;
        }
        .emoji-nav-btn:hover { background: var(--tt-hover-color, rgba(127,127,127,0.15)); color: var(--tt-text-color); }
      `}</style>

      {/* Search + shuffle + skin tone */}
      <CardItemGroup orientation="horizontal" style={{ width: "100%" }}>
        <Spacer orientation="horizontal" size={4} />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
        />

        <button
          type="button"
          onClick={shuffle}
          title="Random emoji"
          style={iconBtn}
        >
          <Shuffle size={16} />
        </button>

        <button
          type="button"
          onClick={() => setShowTones((s) => !s)}
          title="Skin tone"
          style={iconBtn}
        >
          <span
            style={{
              height: 16,
              width: 16,
              borderRadius: "50%",
              background: SKIN_TONES[tone].swatch,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
        </button>
        <Spacer orientation="horizontal" size={4} />
      </CardItemGroup>

      {/* Skin-tone row */}
      {showTones && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {SKIN_TONES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => {
                setTone(i);
                setShowTones(false);
              }}
              style={{
                height: 22,
                width: 22,
                borderRadius: "50%",
                background: t.swatch,
                cursor: "pointer",
                border:
                  i === tone
                    ? "2px solid var(--tt-brand-color-500)"
                    : "1px solid rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>
      )}
      <CardBody
        ref={scrollRef}
        style={{
          height: 260,
          overflowY: "auto",
          marginTop: 8,
          gap: 0,
        }}
      >
        <RecentIconRow target="Emoji" recents={recents} onSelect={onSelect} />
        <Spacer orientation="vertical" size={5} />
        {/* Grid */}
        <div>
          {results ? (
            results.length === 0 ? (
              <span
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--tt-theme-muted, #9ca3af)",
                  padding: "16px 0",
                }}
              >
                No emoji found
              </span>
            ) : (
              renderGrid(results)
            )
          ) : (
            EMOJI_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el;
                }}
                // Skip rendering off-screen sections without a virtualizer.
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 240px",
                }}
              >
                <CardGroupLabel className="emoji-cat-label">
                  {cat.label}
                </CardGroupLabel>
                {renderGrid(cat.emojis)}
              </div>
            ))
          )}
        </div>
      </CardBody>

      {/* Bottom category nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          paddingTop: 6,
          borderTop: "0.5px solid var(--tt-border-color)",
        }}
      >
        <Spacer orientation="horizontal" size={1} />
        <button
          type="button"
          className="emoji-nav-btn"
          title="Top"
          onClick={scrollTop}
        >
          <Clock size={19} />
        </button>
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] ?? Smile;
          return (
            <button
              key={cat.id}
              type="button"
              className="emoji-nav-btn"
              title={cat.label}
              onClick={() => scrollTo(cat.id)}
            >
              <Icon size={19} />
            </button>
          );
        })}
        <Spacer orientation="horizontal" size={1} />
      </div>
    </div>
  );
}
