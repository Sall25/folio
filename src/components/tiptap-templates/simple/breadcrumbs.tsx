import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import type { Page, ID, PageCategory } from "src/types";
import { useBreadcrumbs, usePagesByCategory } from "src/hooks/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import "./breadcrumbs.scss";
import { Bone } from "./components/skeletons";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

// how many crumbs before we collapse the middle
const MAX_VISIBLE = 4;

// Hover-intent: how long the pointer must linger on a crumb before its
// dropdown opens. Cancelled if the pointer leaves first, so brushing past a
// crumb no longer pops the menu.
const OPEN_DELAY = 250;
const CLOSE_DELAY = 120;

function Sep() {
  return (
    <span className="breadcrumbs__sep" aria-hidden="true">
      /
    </span>
  );
}

export function Breadcrumbs({
  pageId,
  showDropdown,
}: {
  pageId: ID | null;
  showDropdown?: boolean;
}) {
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
              showDropdown={showDropdown}
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
  showDropdown = true,
}: {
  page: Page;
  isLast: boolean;
  onClick?: () => void;
  onNavigate: (id: ID) => void;
  showDropdown?: boolean;
}) {
  const label = page.title || "Untitled";
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  // Delay opening: only fire if the pointer actually lingers. A quick brush-by
  // leaves before OPEN_DELAY elapses, and closeSoon() clears the pending open.
  const openNow = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  };

  const closeSoon = () => {
    clearTimers(); // cancel any pending open so a brush-past never triggers it
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  // Clean up any in-flight timer if the crumb unmounts (e.g. navigation)
  // before it fires, avoiding a setState on an unmounted component.
  useEffect(() => () => clearTimers(), []);

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
      {open && showDropdown && (
        <CrumbDropdown
          category={page.category}
          currentId={page.id}
          anchorRef={wrapRef}
          // Moving onto the open dropdown: just cancel the pending close,
          // don't re-arm the open delay (it's already open).
          onHoverEnter={clearTimers}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
      inputRef.current?.focus();
    }
    // fixed positioning doesn't follow scroll — close instead of drifting,
    // but ignore scrolls that happen inside the dropdown's own list
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (
        target instanceof Element &&
        target.closest(".breadcrumbs__dropdown")
      ) {
        return;
      }
      requestClose();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [anchorRef, requestClose]);

  const list = (pages ?? []).filter((p) =>
    (p.title || "Untitled").toLowerCase(),
  );

  if (!pos) return null;

  return createPortal(
    <Card
      className="breadcrumbs__dropdown"
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <CardHeader>
        <CardGroupLabel>{category.toLocaleLowerCase()}</CardGroupLabel>
      </CardHeader>

      <CardBody className="breadcrumbs__dropdown-list">
        {list.length === 0 ? (
          <div className="breadcrumbs__dropdown-empty">No pages</div>
        ) : (
          list.map((p) => (
            <Button
              key={p.id}
              variant="ghost"
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
              <span className="tiptap-button-text">
                {p.title || "Untitled"}
              </span>
            </Button>
          ))
        )}
      </CardBody>
    </Card>,
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
