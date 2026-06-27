import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import type { Page, ID, PageCategory } from "src/types";
import { useBreadcrumbs, usePagesByCategory } from "src/hooks/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import "./breadcrumbs.scss";
import { Bone } from "./components/skeletons";

// how many crumbs before we collapse the middle
const MAX_VISIBLE = 4;

function Sep() {
  return (
    <span className="breadcrumbs__sep" aria-hidden="true">
      /
    </span>
  );
}

export function Breadcrumbs({ pageId }: { pageId: ID | null }) {
  const { data: chain, isPending } = useBreadcrumbs(pageId);
  const { setActivePageId } = useActivePage();

  if (!pageId) return null;
  if (isPending) return <BreadcrumbsSkeleton />;
  if (!chain || chain.length === 0) return null;

  // decide which crumbs to show: collapse the middle if too long.
  // always keep the first (root) and the last two (parent + current).
  const collapsed = chain.length > MAX_VISIBLE;
  const visible = collapsed
    ? [chain[0], ...chain.slice(chain.length - 2)]
    : chain;

  // index in `visible` where the ellipsis goes (after the root) when collapsed
  const ellipsisAfter = collapsed ? 0 : -1;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {visible.map((page, i) => {
        const isLast = i === visible.length - 1;
        return (
          <Fragment key={page.id}>
            <Crumb
              page={page}
              isLast={isLast}
              onClick={isLast ? undefined : () => setActivePageId(page.id)}
              onNavigate={setActivePageId}
            />
            {/* separator + optional ellipsis */}
            {!isLast && <Sep />}
            {i === ellipsisAfter && (
              <>
                <span
                  className="breadcrumbs__ellipsis"
                  aria-label="Hidden pages"
                >
                  <MoreHorizontal size={14} />
                </span>
                <Sep />
              </>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function Crumb({
  page,
  isLast,
  onClick,
  onNavigate,
}: {
  page: Page;
  isLast: boolean;
  onClick?: () => void;
  onNavigate: (id: ID) => void;
}) {
  const label = page.title || "Untitled";
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const content = (
    <>
      <PageItemIcon cover={page.cover} styles={{ width: 16, height: 16 }} />
      <span className="breadcrumbs__label">{label}</span>
    </>
  );

  const crumbEl =
    isLast || !onClick ? (
      <span
        className="breadcrumbs__crumb breadcrumbs__crumb--current"
        aria-current="page"
      >
        {content}
      </span>
    ) : (
      <button
        type="button"
        className="breadcrumbs__crumb breadcrumbs__crumb--link"
        onClick={onClick}
      >
        {content}
      </button>
    );

  return (
    <span
      ref={wrapRef}
      className="breadcrumbs__crumb-wrap"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      {crumbEl}
      {open && (
        <CrumbDropdown
          category={page.category}
          currentId={page.id}
          anchorRef={wrapRef}
          onHoverEnter={openNow}
          onHoverLeave={closeSoon}
          requestClose={() => setOpen(false)}
          onPick={(id) => {
            setOpen(false);
            onNavigate(id);
          }}
        />
      )}
    </span>
  );
}

function CrumbDropdown({
  category,
  currentId,
  anchorRef,
  onHoverEnter,
  onHoverLeave,
  requestClose,
  onPick,
}: {
  category: PageCategory;
  currentId: ID;
  anchorRef: React.RefObject<HTMLElement | null>;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  requestClose: () => void;
  onPick: (id: ID) => void;
}) {
  const { data: pages } = usePagesByCategory(category);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
      inputRef.current?.focus();
    }
    // fixed positioning doesn't follow scroll — close instead of drifting
    const onScroll = () => requestClose();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [anchorRef, requestClose]);

  const q = query.trim().toLowerCase();
  const list = (pages ?? []).filter((p) =>
    (p.title || "Untitled").toLowerCase().includes(q),
  );

  if (!pos) return null;

  return createPortal(
    <div
      className="breadcrumbs__dropdown"
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <div className="breadcrumbs__dropdown-search">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${category.toLowerCase()}…`}
        />
      </div>

      <div className="breadcrumbs__dropdown-list">
        {list.length === 0 ? (
          <div className="breadcrumbs__dropdown-empty">No pages</div>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              className={`breadcrumbs__dropdown-item${
                p.id === currentId ? " breadcrumbs__dropdown-item--current" : ""
              }`}
            >
              <PageItemIcon
                cover={p.cover}
                styles={{ width: 16, height: 16 }}
              />
              <span>{p.title || "Untitled"}</span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}

function BreadcrumbsSkeleton() {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb" aria-busy="true">
      <span className="breadcrumbs__crumb">
        <Bone width={16} height={16} rounded />
        <Bone width={92} height={12} />
      </span>
    </nav>
  );
}
