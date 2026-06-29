import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Check,
  LibraryBig,
} from "lucide-react";

import { readStorage, writeStorage } from "src/lib/local-storage";

import "./section.scss";

// ── menu close context ───────────────────────────────────────────────────────
// Lets SectionMenuItem close the popover after a click without the consumer
// having to thread an onClose through every item.
const SectionMenuContext = createContext<{ close: () => void }>({
  close: () => {},
});

// ── portaled, dismiss-aware popover ──────────────────────────────────────────
// Portaled to <body> so the sidebar's overflow:hidden / scroll container can't
// clip it. Position is computed from the trigger's rect; we close (rather than
// reposition) on scroll/resize to avoid drift.
function SectionMenuPopover({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // right-align the popover to the trigger's right edge
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [anchorRef]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onShift = () => onClose();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onShift, true);
    window.addEventListener("resize", onShift);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onShift, true);
      window.removeEventListener("resize", onShift);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popRef}
      className="sidebar-section-menu"
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── menu building blocks (compose these inside the `menu` prop) ───────────────
export function SectionMenuItem({
  icon,
  label,
  onClick,
  danger,
  selected,
  disabled,
  closeOnClick = true,
}: {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  selected?: boolean;
  disabled?: boolean;
  /** keep the popover open after clicking — e.g. a value selector */
  closeOnClick?: boolean;
}) {
  const { close } = useContext(SectionMenuContext);
  return (
    <button
      type="button"
      className={[
        "sidebar-section-menu__item",
        danger && "sidebar-section-menu__item--danger",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={() => {
        onClick?.();
        if (closeOnClick) close();
      }}
    >
      {icon}
      <span>{label}</span>
      {selected && <Check size={14} className="sidebar-section-menu__check" />}
    </button>
  );
}

export function SectionMenuSeparator() {
  return <div className="sidebar-section-menu__sep" />;
}

export function SectionMenuLabel({ children }: { children: ReactNode }) {
  return <div className="sidebar-section-menu__caption">{children}</div>;
}

// ── the reusable Section ─────────────────────────────────────────────────────
export interface SectionProps {
  label: ReactNode;
  children?: ReactNode;
  /** right-aligned header adornment, e.g. a "Feature of the week" pill */
  badge?: ReactNode;

  collapsible?: boolean; // default true
  collapsed?: boolean; // controlled
  defaultCollapsed?: boolean; // uncontrolled initial
  onToggleCollapse?: () => void; // called on header click when controlled
  /** persist the (uncontrolled) collapsed state under this localStorage key */
  persistKey?: string;

  onAddClick?: () => void; // shows the + button when provided
  addLabel?: string;
  /** popover content; build it from SectionMenuItem / -Separator / -Label */
  menu?: ReactNode;
  menuLabel?: string;

  // drag-and-drop opt-in (the tree wires droppables in via these)
  headerRef?: (el: HTMLElement | null) => void;
  bodyRef?: (el: HTMLElement | null) => void;
  dropActive?: boolean;

  className?: string;
  headerClassName?: string;
  bodyClassName?: string;

  hasLibrary?: boolean;
  onLibraryClick?: () => void;
}

export function Section({
  label,
  children,
  badge,
  collapsible = true,
  collapsed,
  defaultCollapsed = false,
  onToggleCollapse,
  persistKey,
  onAddClick,
  addLabel,
  menu,
  menuLabel,
  headerRef,
  bodyRef,
  dropActive,
  className,
  headerClassName,
  bodyClassName,
  onLibraryClick,
  hasLibrary,
}: SectionProps) {
  const controlled = collapsed !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(() =>
    persistKey && collapsed === undefined
      ? readStorage(persistKey, defaultCollapsed)
      : defaultCollapsed,
  );
  const isCollapsed = collapsible
    ? controlled
      ? (collapsed as boolean)
      : internalCollapsed
    : false;

  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!collapsible) return;
    if (controlled) {
      onToggleCollapse?.();
    } else {
      setInternalCollapsed((v) => {
        const next = !v;
        if (persistKey) writeStorage(persistKey, next);
        return next;
      });
    }
  };

  const hasMenu = menu != null;
  const hasActions = !!onAddClick || hasMenu;

  return (
    <div className={["sidebar-section", className].filter(Boolean).join(" ")}>
      <div
        ref={headerRef}
        className={[
          "sidebar-section__header",
          dropActive && "sidebar-section__header--drop-active",
          headerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ position: "relative" }}
        onClick={toggle}
        onMouseOver={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span className="sidebar-section__label">{label}</span>

        {collapsible && (
          <span
            className="sidebar-section__chevron"
            style={{
              marginTop: 5,
              opacity: hover ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </span>
        )}

        {badge}

        {hasActions && (
          <div
            className="sidebar-section__actions"
            onClick={(e) => e.stopPropagation()}
          >
            {hasLibrary && (
              <button
                type="button"
                className="sidebar-section__action-btn"
                aria-label={"View Library"}
                onClick={onLibraryClick}
              >
                <LibraryBig size={15} />
              </button>
            )}
            {onAddClick && (
              <button
                type="button"
                className="sidebar-section__action-btn"
                aria-label={addLabel}
                onClick={onAddClick}
              >
                <Plus size={15} />
              </button>
            )}
            {hasMenu && (
              <button
                type="button"
                ref={moreBtnRef}
                className="sidebar-section__action-btn"
                aria-label={menuLabel}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MoreHorizontal size={15} />
              </button>
            )}
          </div>
        )}

        {menuOpen && hasMenu && (
          <SectionMenuPopover
            anchorRef={moreBtnRef}
            onClose={() => setMenuOpen(false)}
          >
            <SectionMenuContext.Provider
              value={{ close: () => setMenuOpen(false) }}
            >
              {menu}
            </SectionMenuContext.Provider>
          </SectionMenuPopover>
        )}
      </div>

      {!isCollapsed && (
        <div
          ref={bodyRef}
          className={[
            "sidebar-section__body",
            dropActive && "sidebar-section__body--drop-active",
            bodyClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      )}
    </div>
  );
}
