import { Plus } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ViewIcon } from "../database-toolbar/view-icon";
import { ViewPopover } from "../database-toolbar/view-popover";
import type { DatabaseView } from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import "./database-view-tabs.scss";
import { useDatabaseContext } from "../../context/database-context";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";

interface DatabaseViewTabsProps {
  onRename: (o: boolean) => void;
}

const VIEW_TYPE_KEYS: DatabaseView["type"][] = [
  "table",
  "board",
  "list",
  "gallery",
  "calendar",
  "timeline",
];

// Reserved trailing space (px) for the "N more" + "add" controls, so the last
// visible tab doesn't collide with them.
const MORE_BUTTON_WIDTH = 84;
const ADD_BUTTON_WIDTH = 36;
const TAB_GAP = 8;
// How far (px) the pointer travels before a press on a tab becomes a drag.
const DRAG_THRESHOLD = 4;

type TabDrop = { dragId: string; overId: string; side: "before" | "after" };

/** `views` with `dragId` moved before/after `overId`. */
function reorderViews(views: DatabaseView[], drop: TabDrop): DatabaseView[] {
  const moving = views.find((v) => v.id === drop.dragId);
  if (!moving || drop.dragId === drop.overId) return views;
  const rest = views.filter((v) => v.id !== drop.dragId);
  const at = rest.findIndex((v) => v.id === drop.overId);
  if (at < 0) return views;
  rest.splice(drop.side === "before" ? at : at + 1, 0, moving);
  return rest;
}

export function DatabaseViewTabs({ onRename }: DatabaseViewTabsProps) {
  const { t } = useTranslation();
  const { attrs, db, updateAttributes } = useDatabaseContext();
  const locked = !!attrs.locked;

  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [hovered, setHovered] = useState(false);
  const showAdd = hovered || open; // show on hover, stay while picker open

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(db.views.length);

  const views = db.views;
  const activeId = db.activeView.id;

  const [menuOpen, setMenuOpen] = useState(false);

  // ── Drag to reorder (#180) ──
  // Pointer events, not HTML5 drag: the strip prevents mousedown (so the
  // editor keeps its selection), which also stops native dragstart.
  const [drop, setDrop] = useState<TabDrop | null>(null);
  // Swallows the click that ends a drag, so it doesn't switch view or open
  // the tab's menu.
  const justDraggedRef = useRef(false);

  const startTabDrag = (viewId: string) => (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    const startX = e.clientX;
    let dragging = false;
    let current: TabDrop | null = null;

    const onMove = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return;
      dragging = true;
      const tabs = containerRef.current?.querySelectorAll<HTMLElement>(
        ":scope > .db-view-tab[data-view-id]",
      );
      let next: TabDrop | null = null;
      tabs?.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right) {
          next = {
            dragId: viewId,
            overId: el.dataset.viewId!,
            side: ev.clientX < r.left + r.width / 2 ? "before" : "after",
          };
        }
      });
      if (next) current = next;
      setDrop(current ?? { dragId: viewId, overId: viewId, side: "before" });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDrop(null);
      if (!dragging) return;
      justDraggedRef.current = true;
      // A pointerup outside any tab has no click to swallow.
      window.setTimeout(() => (justDraggedRef.current = false), 0);
      if (current && current.overId !== current.dragId) {
        const next = reorderViews(views, current);
        if (next !== views) updateAttributes?.({ views: next });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // Spread onto every visible tab button.
  const dragProps = (view: DatabaseView) => ({
    "data-view-id": view.id,
    "data-dragging": drop?.dragId === view.id || undefined,
    "data-drop":
      drop && drop.overId === view.id && drop.dragId !== view.id
        ? drop.side
        : undefined,
    onPointerDown: startTabDrag(view.id),
  });

  // Measure natural tab widths (from the hidden copy) and compute how many fit,
  // reserving room for the "N more" and "+" buttons.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container?.parentElement || !measure) return;

    const parent = container.parentElement;

    const recompute = () => {
      // The controls cluster shares the row and grows when search expands inline.
      // Subtract its width so the tabs measure the space ACTUALLY available to
      // them (row − controls), and collapse into "more" when search takes room.
      const controls = parent.querySelector(
        ".db-toolbar-controls",
      ) as HTMLElement | null;
      const controlsW = controls?.getBoundingClientRect().width ?? 0;

      const addReserve = locked ? 0 : ADD_BUTTON_WIDTH;
      const available = parent.offsetWidth - controlsW - addReserve;

      const tabEls = Array.from(measure.children) as HTMLElement[];
      const total = tabEls.reduce((s, el) => s + el.offsetWidth + TAB_GAP, 0);

      if (total <= available) {
        setVisibleCount(tabEls.length);
        return;
      }

      const withMore = available - MORE_BUTTON_WIDTH;
      let used = 0,
        count = 0;
      for (const el of tabEls) {
        used += el.offsetWidth + TAB_GAP;
        if (used > withMore) break;
        count++;
      }
      setVisibleCount(Math.max(1, count));
    };

    recompute();

    // Observe BOTH the row (parent) and the controls cluster. When search expands
    // inline, the controls cluster grows → RO fires → tabs recompute and collapse
    // to make room, so they never overlap.
    const ro = new ResizeObserver(recompute);
    ro.observe(parent);
    const controls = parent.querySelector(".db-toolbar-controls");
    if (controls) ro.observe(controls);

    return () => ro.disconnect();
  }, [views, locked]);

  // Partition into visible + overflow, guaranteeing the active view is visible
  // and NO view is ever dropped.
  const visibleSet = views.slice(0, visibleCount);
  let visibleViews: DatabaseView[];
  let overflowViews: DatabaseView[];

  if (visibleSet.some((v) => v.id === activeId)) {
    // active already visible — simple split
    visibleViews = visibleSet;
    overflowViews = views.slice(visibleCount);
  } else {
    // active is in overflow — put active in the last visible slot, demote the
    // last visible tab into overflow. Rebuild from the FULL list so nothing drops.
    const active = views.find((v) => v.id === activeId)!;
    visibleViews = [...views.slice(0, Math.max(0, visibleCount - 1)), active];
    const visibleIds = new Set(visibleViews.map((v) => v.id));
    overflowViews = views.filter((v) => !visibleIds.has(v.id)); // everything not visible
  }

  const renderTab = (view: DatabaseView) => {
    const isActive = view.id === activeId;
    const iconName = view.iconName;

    if (isActive) {
      if (locked) {
        return (
          <Button
            variant="ghost"
            key={view.id}
            className="db-view-tab"
            data-highlighted
            data-view-id={view.id}
          >
            {iconName ? (
              <DynamicIcon
                className="tiptap-button-icon"
                name={iconName}
                size={18}
              />
            ) : (
              <ViewIcon view={view} />
            )}
            <span className="tiptap-button-text">{view.name}</span>
          </Button>
        );
      }
      return (
        <>
          {!menuOpen ? (
            <Button
              variant="ghost"
              key={view.id}
              className="db-view-tab"
              data-active-state="on"
              {...dragProps(view)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(true); // ← open the popover, not re-activate
              }}
            >
              {iconName ? (
                <DynamicIcon
                  className="tiptap-button-icon"
                  name={iconName}
                  size={20}
                />
              ) : (
                <ViewIcon view={view} />
              )}
              <span className="tiptap-button-text">{view.name}</span>
            </Button>
          ) : (
            <ViewPopover
              key={view.id}
              attrs={attrs}
              view={view}
              onRename={() => onRename(true)}
              onEdit={() => onRename(true)}
              onDelete={() => db.deleteView(view.id)}
              onDuplicate={() => db.duplicateView(view.id)}
              canDelete={attrs.views.length > 1}
              active={isActive}
              onShowDatabaseTitle={() =>
                updateAttributes?.({ ...attrs, hideTitle: false })
              }
            />
          )}
        </>
      );
    }

    return (
      <Button
        variant="ghost"
        key={view.id}
        className="db-view-tab"
        {...dragProps(view)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          db.setActiveView(view.id);
        }}
      >
        {iconName ? (
          <DynamicIcon
            className="tiptap-button-icon"
            name={iconName}
            size={20}
          />
        ) : (
          <ViewIcon view={view} />
        )}
        <span className="tiptap-button-text">{view.name}</span>
      </Button>
    );
  };

  return (
    <div
      ref={containerRef}
      className="db-view-tabs"
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (!justDraggedRef.current) return;
        justDraggedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      data-reordering={drop ? "" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hidden measurement copy — all tabs at natural width, off-layout. */}
      <div ref={measureRef} className="db-view-tabs__measure" aria-hidden>
        {views.map((v) => (
          <span key={v.id} className="db-view-tab db-view-tab--measure">
            <ViewIcon view={v} />
            <span className="tiptap-button-text">{v.name}</span>
          </span>
        ))}
      </div>

      {/* Visible tabs */}
      {visibleViews.map((view) => (
        <Fragment key={view.id}>{renderTab(view)}</Fragment>
      ))}

      {/* Overflow → "N more" listing the hidden views (switch-only). */}
      {overflowViews.length > 0 && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="db-view-tab db-view-tab--more">
              <span className="tiptap-button-text">
                {t("database.views.more", { count: overflowViews.length })}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="db-panel">
            <Card style={{ padding: "5px 10px", minWidth: 180 }}>
              <CardItemGroup>
                {overflowViews.map((view) => (
                  <Button
                    key={view.id}
                    variant="ghost"
                    className="db-view-tab"
                    data-highlighted={view.id === activeId ? "true" : "false"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      db.setActiveView(view.id);
                      setMoreOpen(false);
                    }}
                  >
                    <ViewIcon view={view} />
                    <span className="tiptap-button-text">{view.name}</span>
                  </Button>
                ))}
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
      )}

      {/* Add view */}
      {!locked && (
        <div
          style={{
            display: "inline-flex",
            opacity: showAdd ? 1 : 0,
            pointerEvents: showAdd ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="db-view-tab db-view-tab--add"
                aria-label={t("database.views.addView")}
              >
                <Plus size={13} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
              <Card style={{ padding: "5px 10px", minWidth: 150 }}>
                <CardItemGroup>
                  {VIEW_TYPE_KEYS.map((type) => {
                    const label = t(`database.views.${type}`);
                    return (
                      <Button
                        key={type}
                        variant="ghost"
                        style={{
                          justifyContent: "flex-start",
                          width: "100%",
                          backgroundColor: "transparent",
                          borderRadius: 0,
                        }}
                        onClick={() => {
                          db.addView(type, label);
                          setOpen(false);
                        }}
                      >
                        <ViewIcon view={{ type } as DatabaseView} />
                        <span className="tiptap-button-text">{label}</span>
                      </Button>
                    );
                  })}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
