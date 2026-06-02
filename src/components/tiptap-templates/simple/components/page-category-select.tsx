import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Star, Users, Lock, Building2, ChevronDown, Check } from "lucide-react";
import type { PageCategory } from "../types";
import "./page-category-select.scss";

// Selectable categories — mirror the sidebar sections.
const OPTIONS: { value: PageCategory; label: string; icon: React.ReactNode }[] =
  [
    { value: "Favorites", label: "Favorites", icon: <Star size={15} /> },
    { value: "Shared", label: "Shared", icon: <Users size={15} /> },
    { value: "Private", label: "Private", icon: <Lock size={15} /> },
    { value: "Teamspaces", label: "Teamspaces", icon: <Building2 size={15} /> },
  ];

const DEFAULT_CATEGORY: PageCategory = "Private";

export function PageCategorySelect({
  value,
  onChange,
}: {
  value?: PageCategory;
  onChange: (category: PageCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current =
    OPTIONS.find((o) => o.value === value) ??
    OPTIONS.find((o) => o.value === DEFAULT_CATEGORY)!;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Measure before paint so the menu doesn't flash at the wrong spot.
  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const reposition = () => updatePosition();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // capture=true so we catch scrolls on any ancestor, not just window
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, updatePosition]);

  return (
    <div className="page-category-select">
      <button
        ref={triggerRef}
        className="page-category-select__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="page-category-select__icon">{current.icon}</span>
        <span className="page-category-select__label">{current.label}</span>
        <ChevronDown size={14} className="page-category-select__chevron" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="page-category-select__menu"
            role="listbox"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: Math.max(184, coords.width),
            }}
          >
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                role="option"
                aria-selected={o.value === current.value}
                className="page-category-select__option"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="page-category-select__icon">{o.icon}</span>
                <span className="page-category-select__label">{o.label}</span>
                {o.value === current.value && (
                  <Check size={14} className="page-category-select__check" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
