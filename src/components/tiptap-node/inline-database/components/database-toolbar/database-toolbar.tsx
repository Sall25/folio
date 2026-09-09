import { memo, useCallback, useInsertionEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";

import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  ID,
  RowTemplate,
  SortRule,
} from "src/types";
import { type FilterGroup } from "src/types";
import { ViewOptionsPopover } from "./view-options-popover";
import { DatabaseViewTabs } from "../database-view-tabs/database-view-tabs";
import { FilterControl } from "./filter-control";
import { SortControl } from "./sort-control";
import { useDataSource } from "../../hooks/use-data-source";
import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";
import { DatabaseTitleBar } from "../database-title-bar";
import "./database-toolbar.scss";
import { useDatabaseContext } from "../../nodes/database-context";
import { SearchButton } from "./search-button";
import { NewRecordButton } from "./new-record-button";
import { CollapseToggle } from "./collapse-toggle";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";
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
const EMPTY_TEMPLATES: RowTemplate[] = [];

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
  const viewOptionsOpen = db.viewOptionsOpen;
  const setViewOptionsOpen = db.setViewOptionsOpen;

  const databaseId = attrs.pageId;
  const { setActivePageId } = useActivePageActions();

  const locked = !!attrs.locked;
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? EMPTY_FILTERS;
  const sorts = activeView?.sorts ?? EMPTY_SORTS;
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;

  const { setTarget } = usePageViewActions();

  // Collapsed toolbar — the control cluster folds behind the chevron, leaving
  // just New. Local (per-session UI), not synced view attrs.
  const [collapsed, setCollapsed] = useState(false);
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

  const {
    addRecordAsync,
    createRowTemplateAsync,
    source,
    deleteRowTemplateAsync,
    setDefaultRowTemplateAsync,
  } = useDataSource(attrs.sourceId ?? null);

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

  const onToggle = useCallback(() => setCollapsed((v) => !v), []);

  const onAddView = useCallback(
    (
      type: "timeline" | "table" | "board" | "list" | "gallery" | "calendar",
      label: string,
    ) => db.addView(type, label),
    [db],
  );

  const onCreateTemplate = useCallback(async () => {
    onTemplateOpenChange(false);
    const tpl = await createRowTemplateAsync("New Template");
    if (tpl.pageId) setTarget({ pageId: tpl.pageId, view: "Center" });
  }, [createRowTemplateAsync, onTemplateOpenChange, setTarget]);

  const onDeleteTemplate = useCallback(
    (id: ID) => deleteRowTemplateAsync(id),
    [deleteRowTemplateAsync],
  );
  const templates = source?.rowTemplates ?? EMPTY_TEMPLATES;

  function useEventCallback<Args extends unknown[], R>(
    fn: (...args: Args) => R,
  ) {
    const ref = useRef(fn);
    useInsertionEffect(() => {
      ref.current = fn;
    });
    return useCallback((...args: Args) => ref.current(...args), []);
  }

  // usage:
  const onOpenTemplate = useEventCallback((id: ID) => {
    setTarget({ pageId: id, view: "Center" });
  });
  const onPickTemplate = useCallback(
    (id: ID) =>
      addRecordAsync({
        templateId: id,
      }).then(/* focus/open as you do for new rows */),
    [addRecordAsync],
  );

  const onSetDefault = useCallback(
    (id: ID | null) => setDefaultRowTemplateAsync(id),
    [setDefaultRowTemplateAsync],
  );

  const defaultTemplateId = source?.defaultTemplateId ?? null;

  return (
    <CardItemGroup
      style={{
        marginBottom: 0,
        position: "sticky",
        top: "0px",
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
          className="db-toolbar-controls"
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
            <CardItemGroup orientation="horizontal">
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
                  </>
                )}

                <Spacer orientation="horizontal" size={1} />

                <Button
                  variant="ghost"
                  size="small"
                  tooltip="Open page"
                  style={CONTROL_BUTTON_STYLE}
                  onClick={() => databaseId && setActivePageId(databaseId)}
                >
                  <Maximize2 className="tiptap-button-icon" size={14} />
                </Button>
              </div>
              {activeView && (
                <ViewOptionsPopover
                  properties={properties}
                  db={db}
                  view={activeView}
                />
              )}

              {/* New record + template dropdown — available even when locked. */}

              <NewRecordButton
                collapsed={collapsed}
                locked={locked}
                templates={templates}
                defaultTemplateId={defaultTemplateId}
                open={templateOpen}
                onOpenChange={onTemplateOpenChange}
                onNewPage={handleNewPage}
                onPickTemplate={onPickTemplate}
                onOpenTemplate={onOpenTemplate}
                onDeleteTemplate={onDeleteTemplate}
                onCreateTemplate={onCreateTemplate}
                onSetDefault={onSetDefault}
              />
            </CardItemGroup>
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
