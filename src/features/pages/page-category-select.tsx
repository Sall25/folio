import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Star,
  Users,
  Lock,
  Building2,
  Check,
  ChevronDown,
} from "src/components/icons";
import type { ID, PageCategory } from "src/types";
import "./page-category-select.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useActivePageState } from "./context/active-page-context";
import { Bone } from "../shell/skeletons";
import { usePageTree } from "src/hooks/use-pages";
import { PageItemIcon } from "./page-item/page-item-icon";

// Where a page can live — mirrors the sidebar sections. "Teamspaces" isn't a
// plain option: the menu lists the teamspaces themselves, and picking one
// moves the page into it.
const OPTIONS: {
  value: Exclude<PageCategory, "Template">;
  labelKey: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "Favorites",
    labelKey: "section.favorites",
    label: "Favorites",
    icon: <Star size={15} />,
  },
  {
    value: "Shared",
    labelKey: "section.shared",
    label: "Shared",
    icon: <Users size={15} />,
  },
  {
    value: "Private",
    labelKey: "section.private",
    label: "Private",
    icon: <Lock size={15} />,
  },
  {
    value: "Teamspaces",
    labelKey: "section.teamspaces",
    label: "Teamspaces",
    icon: <Building2 size={15} />,
  },
];
const PLAIN_OPTIONS = OPTIONS.filter((o) => o.value !== "Teamspaces");

const DEFAULT_CATEGORY: PageCategory = "Private";

export function PageCategorySelect({
  value,
  onChange,
  teamspaceId = null,
  onMoveToTeamspace,
  locked = false,
}: {
  value?: PageCategory;
  /** Favorites / Shared / Private. */
  onChange: (category: PageCategory) => void;
  /** The teamspace the page is in, if any. */
  teamspaceId?: ID | null;
  /** Move the page into a teamspace (shown when provided). */
  onMoveToTeamspace?: (teamspaceId: ID) => void;
  /** A teamspace's own page: shows where it is, can't be moved from here. */
  locked?: boolean;
}) {
  const { t } = useTranslation();
  const { tree } = usePageTree();
  const { activePageId } = useActivePageState();
  // Teamspaces you can see here (your own and joined ones), never the page
  // itself.
  const teamspaces = useMemo(
    () =>
      (tree.Teamspaces ?? [])
        .map((n) => n.page)
        .filter((p) => p.id !== activePageId),
    [tree, activePageId],
  );
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useActivePageState();

  const current =
    OPTIONS.find((o) => o.value === value) ??
    OPTIONS.find((o) => o.value === DEFAULT_CATEGORY)!;

  // In a teamspace, the trigger names the teamspace itself.
  const currentTeamspace = teamspaceId
    ? ((tree.Teamspaces ?? []).find((n) => n.page.id === teamspaceId)?.page ??
      null)
    : null;

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

  if (isLoading) {
    return (
      <div className="page-category-select" aria-hidden="true">
        <Button className="page-category-select__trigger" disabled>
          <Bone width={15} height={15} rounded />
          <Bone width={56} height={12} />
          <Bone width={14} height={14} rounded />
        </Button>
      </div>
    );
  }

  const triggerIcon = currentTeamspace ? (
    <PageItemIcon
      cover={currentTeamspace.cover}
      styles={{ width: 15, height: 15, fontSize: 14 }}
    />
  ) : (
    current.icon
  );
  const triggerLabel = currentTeamspace
    ? currentTeamspace.title || t("page.untitled", "Untitled")
    : t(current.labelKey, current.label);

  return (
    <div className="page-category-select">
      <Button
        ref={triggerRef}
        className="page-category-select__trigger"
        onClick={() => !locked && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={locked}
        tooltip={locked ? t("pageLocation.teamspaceRoot") : undefined}
      >
        <span className="page-category-select__icon">{triggerIcon}</span>
        <span className="page-category-select__label">{triggerLabel}</span>
        {!locked && (
          <ChevronDown size={14} className="page-category-select__chevron" />
        )}
      </Button>

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
            {PLAIN_OPTIONS.map((o) => {
              const selected = !teamspaceId && o.value === current.value;
              return (
                <button
                  key={o.value}
                  role="option"
                  aria-selected={selected}
                  className="page-category-select__option"
                  onClick={() => {
                    if (!selected) onChange(o.value);
                    setOpen(false);
                  }}
                  style={{ width: "100%" }}
                >
                  <span className="page-category-select__icon">{o.icon}</span>
                  <span className="page-category-select__label">
                    {t(o.labelKey, o.label)}
                  </span>
                  {selected && (
                    <Check size={14} className="page-category-select__check" />
                  )}
                </button>
              );
            })}

            {onMoveToTeamspace && (
              <>
                <div className="page-category-select__group">
                  {t("section.teamspaces", "Teamspaces")}
                </div>
                {teamspaces.length === 0 ? (
                  <div className="page-category-select__hint">
                    {t("pageLocation.noTeamspaces")}
                  </div>
                ) : (
                  teamspaces.map((ts) => {
                    const selected = ts.id === teamspaceId;
                    return (
                      <button
                        key={ts.id}
                        role="option"
                        aria-selected={selected}
                        className="page-category-select__option"
                        onClick={() => {
                          if (!selected) onMoveToTeamspace(ts.id);
                          setOpen(false);
                        }}
                        style={{ width: "100%" }}
                      >
                        <span className="page-category-select__icon">
                          <PageItemIcon
                            cover={ts.cover}
                            styles={{ width: 15, height: 15, fontSize: 14 }}
                          />
                        </span>
                        <span className="page-category-select__label">
                          {ts.title || t("page.untitled", "Untitled")}
                        </span>
                        {selected && (
                          <Check
                            size={14}
                            className="page-category-select__check"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
