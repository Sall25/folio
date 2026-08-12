import { Plus } from "lucide-react";
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
import { useLayoutEffect, useRef, useState } from "react";
import "./database-view-tabs.scss";
import { useDatabaseContext } from "../../nodes/database-context";

interface DatabaseViewTabsProps {
  onRename: (o: boolean) => void;
}

const VIEW_TYPES: { type: DatabaseView["type"]; label: string }[] = [
  { type: "table", label: "Table" },
  { type: "board", label: "Board" },
  { type: "list", label: "List" },
  { type: "gallery", label: "Gallery" },
  { type: "calendar", label: "Calendar" },
  { type: "timeline", label: "Timeline" },
];

// Reserved trailing space (px) for the "N more" + "add" controls, so the last
// visible tab doesn't collide with them.
const MORE_BUTTON_WIDTH = 84;
const ADD_BUTTON_WIDTH = 36;
const TAB_GAP = 8;

export function DatabaseViewTabs({ onRename }: DatabaseViewTabsProps) {
  const { attrs, db, updateAttributes } = useDatabaseContext();
  const locked = !!attrs.locked;

  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [hovered, setHovered] = useState(false);
  const showAdd = hovered || open; // show on hover, stay while picker open

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(attrs.views.length);

  const views = attrs.views;
  const activeId = attrs.activeViewId;

  // Measure natural tab widths (from the hidden copy) and compute how many fit,
  // reserving room for the "N more" and "+" buttons.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const reserve =
        (locked ? 0 : ADD_BUTTON_WIDTH) +
        (views.length > 1 ? MORE_BUTTON_WIDTH : 0);
      const available = container.offsetWidth - reserve;

      const tabEls = Array.from(measure.children) as HTMLElement[];
      let used = 0;
      let count = 0;
      for (const el of tabEls) {
        const w = el.offsetWidth + TAB_GAP;
        if (used + w > available) break;
        used += w;
        count++;
      }
      setVisibleCount(Math.max(1, count));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [views, locked]);

  // Split visible / overflow, then guarantee the ACTIVE view stays visible: if
  // it fell into overflow, swap it into the last visible slot.
  let visibleViews = views.slice(0, visibleCount);
  let overflowViews = views.slice(visibleCount);

  if (overflowViews.some((v) => v.id === activeId) && visibleViews.length > 0) {
    const activeView = overflowViews.find((v) => v.id === activeId)!;
    const demoted = visibleViews[visibleViews.length - 1];
    visibleViews = [...visibleViews.slice(0, -1), activeView];
    overflowViews = [
      demoted,
      ...overflowViews.filter((v) => v.id !== activeId),
    ];
  }

  // Your original per-view rendering, unchanged — extracted so both the visible
  // row and (the inactive-tab form) the overflow menu can reuse it.
  const renderTab = (view: DatabaseView) => {
    const isActive = view.id === activeId;

    if (isActive) {
      if (locked) {
        return (
          <Button
            variant="ghost"
            key={view.id}
            className="db-view-tab"
            data-highlighted
            // data-active-state="on"
          >
            <ViewIcon view={view} />
            <span className="tiptap-button-text">{view.name}</span>
          </Button>
        );
      }
      return (
        <ViewPopover
          key={view.id}
          attrs={attrs}
          view={view}
          onRename={() => onRename(true)}
          onDelete={() => db.deleteView(view.id)}
          canDelete={attrs.views.length > 1}
          active={isActive}
          onShowDatabaseTitle={() =>
            updateAttributes?.({ ...attrs, hideTitle: false })
          }
        />
      );
    }

    return (
      <Button
        variant="ghost"
        key={view.id}
        className="db-view-tab"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          db.setActiveView(view.id);
        }}
      >
        <ViewIcon view={view} />
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

      {/* Visible tabs — your exact per-tab logic via renderTab. */}
      {visibleViews.map(renderTab)}

      {/* Overflow → "N more" listing the hidden views (switch-only). */}
      {overflowViews.length > 0 && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="db-view-tab db-view-tab--more">
              <span className="tiptap-button-text">
                {overflowViews.length} more…
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
                    data-active-state={view.id === activeId ? "on" : "off"}
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

      {/* Add view — your exact original block, unchanged. */}
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
                aria-label="Add view"
              >
                <Plus size={13} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="db-panel">
              <Card style={{ padding: "5px 10px", minWidth: 150 }}>
                <CardItemGroup>
                  {VIEW_TYPES.map(({ type, label }) => (
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
                  ))}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
