import { memo, useCallback, useInsertionEffect, useRef, useState } from "react";
import { Maximize2 } from "src/components/icons";
import { useTranslation } from "react-i18next";
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
import { usePageViewActions } from "src/features/pages/context/page-view-context";
import "./database-toolbar.scss";
import { useDatabaseContext } from "../../context/database-context";
import { SearchButton } from "./search-button";
import { NewRecordButton } from "./new-record-button";
import { CollapseToggle } from "./collapse-toggle";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { NoDatePanel } from "../no-date-panel";
import { startingTemplateId } from "../../utils/row-templates";
import { useLocalStorage } from "src/hooks/use-local-storage";
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
  const { t } = useTranslation();
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
  // Collapsed toolbar — the control cluster folds behind the chevron, leaving
  // just New. Remembered per database block in this browser (your own view
  // of the page — not synced to others, unlike view attrs).
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    `db-toolbar-collapsed:${attrs.id}`,
    false,
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showChevrons, setShowChevrons] = useState(false);

  const onViewOptionsOpenChange = useCallback(
    (o: boolean) => setViewOptionsOpen(o),
    [setViewOptionsOpen],
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

  // Keep controls visible while a popover is open, so they don't vanish from
  // under the user when the mouse leaves the node.
  const showControls = !locked || viewOptionsOpen || templateOpen;
  const revealStyle: React.CSSProperties = {
    opacity: showControls ? 1 : 0,
    pointerEvents: showControls ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  // New starts from the default template, like the "+ New page" row.
  const handleNewPage = useCallback(async () => {
    const templateId = startingTemplateId(source);
    addRecordAsync(templateId ? { templateId } : { title: "" })
      .then((page) => setTarget({ pageId: page.id, view: "Center" }))
      .catch((error) => console.error("Failed to create page", error));
  }, [addRecordAsync, setTarget, source]);

  const onToggle = useCallback(() => setCollapsed((v) => !v), [setCollapsed]);

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
        minWidth: 0, // CardItemGroup is max-content by default: the row
        width: "100%", // must stay this wide for the tabs to overflow
      }}
      contentEditable={false}
    >
      <CardItemGroup
        orientation="horizontal"
        style={{ minWidth: 0, width: "100%" }}
      >
        {/* Always the view tabs, even with a single view; the database's
            title sits above them (DatabaseNodeView), not in their place. */}
        <DatabaseViewTabs onRename={onViewOptionsOpenChange} />
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
                    <NoDatePanel />
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
                  tooltip={t("database.toolbar.openPage")}
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
