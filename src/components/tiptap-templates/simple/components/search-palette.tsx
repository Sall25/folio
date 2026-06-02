import { useState, useRef, useEffect, useMemo } from "react";
import "./search-palette.scss";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { X } from "lucide-react";
import { useSearch } from "../context/search-context";

// ---- Types ----
type Group = "today" | "past";

export interface SearchItem {
  id: number;
  title: string;
  location: string | null;
  icon: string;
  group: Group;
  date?: string;
}

interface SearchPaletteProps {
  items?: SearchItem[];
  onSelect?: (item: SearchItem) => void;
}

type IconName =
  | "search"
  | "user"
  | "layers"
  | "doc"
  | "calendar"
  | "chevron"
  | "return"
  | "updown"
  | "enter";

interface FilterDef {
  id: string;
  label: string;
  lead?: string;
  icon?: IconName;
  toggle?: boolean;
}

interface Match {
  item: SearchItem;
  titleHl: number[] | null;
  locHl: number[] | null;
}

// ---- Demo data (replace with your real results) ----
const ITEMS: SearchItem[] = [
  {
    id: 1,
    title: "My first project",
    location: "Projects",
    icon: "👾",
    group: "today",
  },
  {
    id: 2,
    title: "Company Home",
    location: "General",
    icon: "💼",
    group: "today",
  },
  {
    id: 3,
    title: "Vision to Values",
    location: null,
    icon: "🖼️",
    group: "today",
  },
  { id: 4, title: "Tasks", location: "Marketing", icon: "☑️", group: "today" },
  {
    id: 5,
    title: "Projects",
    location: "Marketing",
    icon: "🎯",
    group: "today",
  },
  {
    id: 6,
    title: "Tasks",
    location: "General",
    icon: "✏️",
    group: "past",
    date: "Jan 18",
  },
  {
    id: 7,
    title: "Teamspace Home",
    location: "New teamspace",
    icon: "🏠",
    group: "past",
    date: "Jan 18",
  },
  {
    id: 8,
    title: "Marketing Home",
    location: "Marketing",
    icon: "🎬",
    group: "past",
    date: "Jan 18",
  },
  {
    id: 9,
    title: "Meeting notes",
    location: "General",
    icon: "🎷",
    group: "past",
    date: "Jan 18",
  },
  {
    id: 10,
    title: "Docs",
    location: "General",
    icon: "📄",
    group: "past",
    date: "Jan 18",
  },
];

const FILTERS: FilterDef[] = [
  { id: "titles", label: "Only search titles", lead: "Aa", toggle: true },
  { id: "created", label: "Created by", icon: "user" },
  { id: "teamspace", label: "Teamspace", icon: "layers" },
  { id: "page", label: "In page", icon: "doc" },
  { id: "date", label: "Date", icon: "calendar" },
];

// ---- Fuzzy matcher: greedy subsequence, returns matched indices or null ----
function fuzzyMatch(query: string, text: string): number[] | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      qi++;
    }
  }
  return qi === q.length ? indices : null;
}

// ---- Inline icon set ----
function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      );
    case "layers":
      return (
        <svg {...p}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...p}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "return":
    case "enter":
      return (
        <svg {...p}>
          <path d="M9 10 4 15l5 5" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>
      );
    case "updown":
      return (
        <svg {...p}>
          <path d="m7 4 0 16M3 8l4-4 4 4M17 20l0-16M13 16l4 4 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

// ---- Highlight matched characters ----
function Highlight({
  text,
  indices,
}: {
  text: string;
  indices: number[] | null;
}) {
  if (!indices || indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <span key={i} className="sp-hl">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </>
  );
}

export default function SearchPalette({
  items = ITEMS,
  onSelect,
}: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [titlesOnly, setTitlesOnly] = useState(false);
  const [selected, setSelected] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<Match[]>(() => {
    const q = query.trim();
    if (!q) return items.map((item) => ({ item, titleHl: [], locHl: [] }));
    const out: Match[] = [];
    for (const item of items) {
      const titleHl = fuzzyMatch(q, item.title);
      const locHl =
        !titlesOnly && item.location ? fuzzyMatch(q, item.location) : null;
      if (titleHl !== null || locHl !== null)
        out.push({ item, titleHl, locHl });
    }
    return out;
  }, [query, titlesOnly, items]);

  const groups = useMemo(() => {
    const today = results.filter((r) => r.item.group === "today");
    const past = results.filter((r) => r.item.group === "past");
    return { today, past, order: [...today, ...past] };
  }, [results]);

  const { onOpenChange } = useSearch();

  // useEffect(() => {
  //   setSelected((s) => Math.min(s, Math.max(0, groups.order.length - 1)));
  // }, [groups.order.length]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const open = (item: SearchItem) => {
    if (onSelect) onSelect(item);
    else console.log("open", item.title);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, groups.order.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      const m = groups.order[selected];
      if (m) open(m.item);
    }
  };

  const renderRow = (m: Match) => {
    const idx = groups.order.indexOf(m);
    const isSel = idx === selected;
    return (
      <div
        key={m.item.id}
        data-idx={idx}
        className={`sp-row${isSel ? " sp-row--sel" : ""}`}
        onMouseEnter={() => setSelected(idx)}
        onClick={() => open(m.item)}
      >
        <span className="sp-row__icon">{m.item.icon}</span>
        <span className="sp-row__title">
          <Highlight text={m.item.title} indices={m.titleHl} />
        </span>
        {m.item.location && (
          <span className="sp-row__loc">
            — <Highlight text={m.item.location} indices={m.locHl} />
          </span>
        )}
        <span className="sp-row__right">
          {isSel ? (
            <Icon name="return" size={15} />
          ) : m.item.date ? (
            <span className="sp-row__date">{m.item.date}</span>
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <div className="sp-backdrop">
      <div className="sp" role="dialog" aria-label="Search">
        <CardItemGroup orientation="horizontal">
          <div className="sp-search">
            <span className="sp-search__icon">
              <Icon name="search" size={18} />
            </span>
            <input
              ref={inputRef}
              className="sp-search__input"
              placeholder="Search Acme Inc...."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <Spacer orientation="horizontal" />
          <Button variant="ghost" onClick={() => onOpenChange?.(false)}>
            <X className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>

        <div className="sp-filters">
          {FILTERS.map((f) => {
            const on = f.toggle && titlesOnly;
            return (
              <button
                key={f.id}
                className={`sp-pill${on ? " sp-pill--on" : ""}`}
                onClick={() => f.toggle && setTitlesOnly((v) => !v)}
              >
                {f.lead ? (
                  <span className="sp-pill__aa">{f.lead}</span>
                ) : f.icon ? (
                  <Icon name={f.icon} size={13} />
                ) : null}
                <span>{f.label}</span>
                {!f.toggle && (
                  <span className="sp-pill__chev">
                    <Icon name="chevron" size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="sp-results" ref={listRef}>
          {groups.order.length === 0 && (
            <div className="sp-empty">No results for “{query}”</div>
          )}
          {groups.today.length > 0 && (
            <>
              <div className="sp-section">Today</div>
              {groups.today.map(renderRow)}
            </>
          )}
          {groups.past.length > 0 && (
            <>
              <div className="sp-section">Past Week</div>
              {groups.past.map(renderRow)}
            </>
          )}
        </div>

        <div className="sp-footer">
          <span className="sp-hint">
            <Icon name="updown" size={13} /> Select
          </span>
          <span className="sp-hint">
            <Icon name="enter" size={13} /> Open
          </span>
          <span className="sp-hint">
            <kbd className="sp-kbd">⌘</kbd>
            <Icon name="enter" size={13} /> Open in a new window
          </span>
        </div>
      </div>
    </div>
  );
}
