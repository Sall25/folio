import { memo, useCallback, useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";

import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  SortRule,
} from "src/types";
import { type FilterGroup } from "src/types";
import { ViewOptionsPopover } from "./view-options-popover";
import { DatabaseViewTabs } from "../database-view-tabs/database-view-tabs";
import { FilterControl } from "./filter-control";
import { SortControl } from "./sort-control";
import { useDataSource } from "../../hooks/use-data-source";
import { usePages } from "src/hooks/use-pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { makeRowTemplate } from "src/utils/make-row-template";
import { DatabaseTitleBar } from "../database-title-bar";
import "./database-toolbar.scss";
import { useDatabaseContext } from "../../nodes/database-context";
import { SearchButton } from "./search-button";
import { NewRecordButton } from "./new-record-button";
import { CollapseToggle } from "./collapse-toggle";
// ── helpers ──────────────────────────────────────────────────────────────────

function getActiveView(attrs: DatabaseAttrs): DatabaseView | undefined {
  return attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];
}

function totalFilterRules(filters: FilterGroup[]): number {
  return filters.reduce((sum, g) => sum + g.rules.length, 0);
}

const EMPTY_PROPERTIES: DatabaseProperty[] = [];
const EMPTY_SORTS: SortRule[] = [];
const EMPTY_FILTERS: FilterGroup[] = [];

// Shared style for the small square control buttons (search/filter/sort).
const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  minHeight: 22,
  height: 22,
  borderRadius: "var(--tt-radius-sm)",
  background: "transparent",
};

// ── main toolbar ─────────────────────────────────────────────────────────────

function DatabaseToolbarImpl() {
  const {
    showFilterChips,
    onShowFilterChipsChange,
    showSortChips,
    onShowSortChipsChange,
    attrs,
    db,
  } = useDatabaseContext();

  const locked = !!attrs.locked;
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? EMPTY_FILTERS;
  const sorts = activeView?.sorts ?? EMPTY_SORTS;
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;

  const { data: pages } = usePages();
  const { setTarget } = usePageView();

  // Collapsed toolbar — the control cluster folds behind the chevron, leaving
  // just New. Local (per-session UI), not synced view attrs.
  const [collapsed, setCollapsed] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showChevrons, setShowChevrons] = useState(false);

  const onViewOptionsOpenChange = useCallback(
    (o: boolean) => setViewOptionsOpen(o),
    [],
  );
  const onTemplateOpenChange = useCallback(
    (o: boolean) => setTemplateOpen(o),
    [],
  );

  const { addRecordAsync, addRowTemplateAsync, source } = useDataSource(
    attrs.sourceId ?? null,
  );

  const properties = source?.properties ?? EMPTY_PROPERTIES;
  const isSingleView = attrs.views.length <= 1;

  // Keep controls visible while a popover is open, so they don't vanish from
  // under the user when the mouse leaves the node.
  const showControls = !locked || viewOptionsOpen || templateOpen;
  const revealStyle: React.CSSProperties = {
    opacity: showControls ? 1 : 0,
    pointerEvents: showControls ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  const handleNewPage = useCallback(async () => {
    addRecordAsync({ title: "" })
      .then((page) => setTarget({ pageId: page.id, view: "Center" }))
      .catch(() => console.log("Failed to create page"));
  }, [addRecordAsync, setTarget]);

  const templates = useMemo(
    () => (pages ?? []).filter((p) => p.category === "Template"),
    [pages],
  );

  const onToggle = useCallback(() => setCollapsed((v) => !v), []);

  const onAddView = useCallback(
    (
      type: "timeline" | "table" | "board" | "list" | "gallery" | "calendar",
      label: string,
    ) => db.addView(type, label),
    [db],
  );
  const onCreateTemplate = useCallback(() => {
    onTemplateOpenChange(false);
    if (!source) return;
    addRowTemplateAsync(makeRowTemplate(source, { name: "New Template" }));
  }, [source, onTemplateOpenChange, addRowTemplateAsync]);

  return (
    <CardItemGroup
      style={{
        marginBottom: 10,
        position: "relative",
        maxWidth: "var(--db-editor-width)",
      }}
      contentEditable={false}
    >
      <CardItemGroup orientation="horizontal">
        {isSingleView ? (
          <DatabaseTitleBar onAddView={onAddView} />
        ) : (
          <DatabaseViewTabs onRename={onViewOptionsOpenChange} />
        )}
        <Spacer orientation="horizontal" />

        {/* Hover-revealed control cluster. */}
        <div
          style={revealStyle}
          onMouseOver={() => setShowChevrons(true)}
          onMouseLeave={() => setShowChevrons(false)}
        >
          <CardItemGroup orientation="horizontal">
            <Spacer orientation="horizontal" />

            {/* Collapse chevron — always mounted when collapsed (the way back). */}
            <CollapseToggle
              collapsed={collapsed}
              visible={showChevrons}
              onToggle={onToggle}
            />
            <div
              className="db-toolbar__collapsible"
              data-collapsed={collapsed || undefined}
              aria-hidden={collapsed}
            >
              {/* View-config controls — hidden when locked. */}
              {!locked && (
                <>
                  <SearchButton db={db} />
                  {/* <Spacer orientation="horizontal" size={1} /> */}

                  <FilterControl
                    db={db}
                    activeView={activeView}
                    properties={properties}
                    activeFilterCount={activeFilterCount}
                    showFilterChips={showFilterChips}
                    onShowFilterChipsChange={onShowFilterChipsChange}
                  />
                  {/* <Spacer orientation="horizontal" size={1} /> */}

                  <SortControl
                    db={db}
                    activeView={activeView}
                    properties={properties}
                    sorts={sorts}
                    activeSortCount={activeSortCount}
                    showSortChips={showSortChips}
                    onShowSortChipsChange={onShowSortChipsChange}
                  />
                  {/* <Spacer orientation="horizontal" size={1} /> */}

                  {/* View options */}
                  <Button
                    variant="ghost"
                    size="small"
                    tooltip="Open page"
                    style={CONTROL_BUTTON_STYLE}
                    onClick={() => onViewOptionsOpenChange(true)}
                  >
                    <Maximize2 className="tiptap-button-icon" size={14} />
                  </Button>
                </>
              )}

              {/* <Spacer orientation="horizontal" size={1} /> */}
              {activeView && (
                <ViewOptionsPopover
                  properties={properties}
                  db={db}
                  view={activeView}
                />
              )}
              <Spacer orientation="horizontal" size={1} />

              {/* New record + template dropdown — available even when locked. */}
              <NewRecordButton
                collapsed={collapsed}
                locked={locked}
                templates={templates}
                open={templateOpen}
                onOpenChange={onTemplateOpenChange}
                onNewPage={handleNewPage}
                onCreateTemplate={onCreateTemplate}
              />
            </div>
          </CardItemGroup>
        </div>

        {!locked && viewOptionsOpen && activeView && (
          <div style={{ position: "absolute", top: 25, right: 0, zIndex: 999 }}>
            <ViewOptionsPopover
              properties={properties}
              db={db}
              view={activeView}
              open={true}
              onOpenChange={() => setViewOptionsOpen(false)}
            />
          </div>
        )}
      </CardItemGroup>
    </CardItemGroup>
  );
}

export const DatabaseToolbar = memo(DatabaseToolbarImpl);
