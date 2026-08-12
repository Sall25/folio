// The database NodeView. Responsibilities kept here are orchestration only:
//   - load the DataSource + view state
//   - call the focused hooks (records, view-switch, title, column layout,
//     bridge publish, node sync, chip visibility)
//   - assemble the chrome (cover, toolbar, title bar, filter/sort chips)
//   - branch to the six view renderers (table is node-rendered; the other five
//     are still imperative)

import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { usePage } from "src/hooks/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import { DatabaseToolbar } from "../components/database-toolbar";
import { DatabaseTitleBar } from "../components/database-title-bar";
import { FilterRuleChips } from "../components/filter-rule-chips";
import { SortRuleChips } from "../components/sort-rule-chips/sort-rule-chips";
import { DataSourcePicker } from "./data-source-picker";
import { DatabaseBoardNodeView } from "./database-board-node-view";
import { DatabaseGalleryNodeView } from "./database-gallery-node-view";
import { DatabaseListNodeView } from "./database-list-node-view/database-list-node-view";
import { DatabaseCalendarNodeView } from "./database-calendar-node-view";
import { DatabaseTimelineNodeView } from "./database-timeline-node-view";
import { DatabaseLoadingSkeleton } from "../components/database-loading-skeleton";
import { DatabaseTableBody } from "./database-table-body";
import { useDatabaseColumnLayout } from "../hooks/use-database-column-layout";
import { useDatabaseBridgePublish } from "../hooks/use-database-bridge-publish";
import {
  useDatabaseSeed,
  useDatabaseCellSync,
  removeRecordNode,
} from "../hooks/use-database-seed";
import { useTableRecords } from "../hooks/use-table-records";
import { useViewSwitch } from "../hooks/use-view-switch";
import { useChipVisibility } from "../hooks/use-chip-visibility";

import { type DatabaseAttrs, type ID, type DatabaseProperty } from "src/types";
import "./database-table-node-view.scss";
import "./database-node.scss";
import { SelectionToolbar } from "../components/selection-toolbar";
import { NewRowEditProvider } from "./new-row-edit-provider";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

const EMPTY_SOURCE = { properties: [] };
const EMPTY_PROPERTIES: DatabaseProperty[] = [];

export function DatabaseNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const locked = !!attrs.locked;

  // ── DataSource + view state ───────────────────────────────────────────────
  const {
    source,
    isLoading,
    setCellValue,
    updatePropertiesAsync,
    updateSourceMetaAsync,
    registerViewsAsync,
    unregisterViewsAsync,
    resolvedRecords,
    addRecordAsync,
    removeRecordAsync,
  } = useDataSource(attrs.sourceId);

  const [editingRecordId, setEditingRecordId] = useState<ID | null>(null);

  const cancelEmptyRecord = useCallback(
    (recordId: ID) => {
      // Remove the record node from the editor, then delete the page.
      if (editor && attrs.id) removeRecordNode(editor, attrs.id, recordId);
      removeRecordAsync(recordId);
      setEditingRecordId(null);
    },
    [editor, attrs.id, removeRecordAsync],
  );

  const attrsRef = useRef(attrs);
  attrsRef.current = attrs;

  const handleTitleUpdate = useCallback(
    (title: string) => updateAttributes({ ...attrsRef.current, title }),
    [updateAttributes],
  );

  const db = useDatabase(
    attrs,
    updateAttributes,
    source ?? EMPTY_SOURCE,
    updatePropertiesAsync,
    handleTitleUpdate,
  );
  const activeView = db.activeView;

  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const { data: dbPage } = usePage(dbPageId);

  const tableRef = useRef<HTMLDivElement>(null);

  // ── View switching (skeleton while a new view type mounts) ────────────────
  const { switchingTo, dbWithSwitch } = useViewSwitch(db, attrs.activeViewId);

  // ── Filtered → searched → sorted → grouped records + row layout ───────────
  const { sortedRecords, collapsedKeys, rowSlots } = useTableRecords({
    resolvedRecords,
    source,
    db,
    editingRecordId,
  });

  // ── View lifecycle effects ────────────────────────────────────────────────
  // Register present views.
  useEffect(() => {
    if (!source) return;
    registerViewsAsync(attrs.views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, registerViewsAsync]);

  // Prune saved views that were deleted from the node.
  useEffect(() => {
    if (!source) return;
    const liveIds = new Set(attrs.views.map((v) => v.id));
    const orphanIds = (source.savedViews ?? [])
      .map((sv) => sv.id)
      .filter((id) => !liveIds.has(id));
    if (orphanIds.length) unregisterViewsAsync(orphanIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, unregisterViewsAsync]);

  // Activate a view from the URL hash (#view=…) once, on first load.
  const hashActivatedRef = useRef(false);
  useEffect(() => {
    if (hashActivatedRef.current || db.views?.length === 0) return;
    hashActivatedRef.current = true;
    const viewId = window.location.hash.match(/view=([^&]+)/)?.[1];
    if (
      viewId &&
      db.views.some((v) => v.id === viewId) &&
      viewId !== attrs.activeViewId
    ) {
      db.setActiveView(viewId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.views?.length]);

  const {
    draftWidths,
    visibleProperties,
    widthFor,
    gridTemplateColumns,
    bodyGridTemplateColumns,
    commitColumnWidth,
  } = useDatabaseColumnLayout({
    properties: source?.properties ?? EMPTY_PROPERTIES,
    activeView,
    locked,
    tableRef,
    updatePropertiesAsync,
  });

  useDatabaseBridgePublish({
    editor,
    attrs,
    properties: source?.properties ?? [],
    activeView,
    locked,
    resolvedRecords,
    sortedRecords,
    draftWidths,
    rowSlots,
    hasSource: !!source,
    setCellValue: (recordId, propertyId, value) =>
      setCellValue(recordId, propertyId, value as never),
  });

  // Seed record/cell nodes once at creation; keep cells matching properties.
  useDatabaseSeed({
    editor,
    databaseId: attrs.id ?? null,
    sourceId: attrs.sourceId ?? null,
    records: resolvedRecords,
    properties: source?.properties ?? [],
    ready: !isLoading && !!source,
  });
  useDatabaseCellSync({
    editor,
    databaseId: attrs.id ?? null,
    properties: source?.properties ?? [],
    ready: !isLoading && !!source,
  });

  // ── Chip-row visibility (auto-reveal when rules appear) ───────────────────
  const filterRuleCount =
    activeView?.filters?.reduce((n, g) => n + g.rules.length, 0) ?? 0;
  const sortCount = activeView?.sorts?.length ?? 0;
  const { showFilterChips, showSortChips } = useChipVisibility(
    filterRuleCount,
    sortCount,
  );

  const { activePageId } = useActivePage();
  const isOwnPage = activePageId != null && activePageId === dbPageId;

  // ── No source yet → picker ────────────────────────────────────────────────
  if (!attrs.sourceId) {
    return (
      <NodeViewWrapper as="div" data-type="database" contentEditable={false}>
        <DataSourcePicker
          onSelect={(sourceId, pageId, isLinked, savedView) =>
            updateAttributes({
              ...attrs,
              sourceId,
              pageId: pageId ?? attrs.pageId ?? null,
              isLinked: !!isLinked,
              title: "",
              ...(savedView
                ? { views: [savedView], activeViewId: savedView.id }
                : {}),
            })
          }
        />
      </NodeViewWrapper>
    );
  }
  if (isLoading || !source) {
    return <DatabaseLoadingSkeleton type={activeView?.type ?? "table"} />;
  }

  // ── Chrome wrapper shared by every view ───────────────────────────────────
  const chrome = (body: React.ReactNode) => (
    <NewRowEditProvider value={{ editingRecordId, cancelEmptyRecord }}>
      <NodeViewWrapper className="db-node">
        <DatabaseProvider
          resolvedRecords={resolvedRecords}
          updateSourceMetaAsync={updateSourceMetaAsync}
          attrs={attrs}
          // Switch-aware db so view tabs anywhere downstream trigger the skeleton.
          db={dbWithSwitch}
          source={source}
          editor={editor}
          updateAttributes={updateAttributes}
          addRecordAsync={addRecordAsync}
          setCellValue={setCellValue}
          setEditingRecordId={setEditingRecordId}
          visibleProperties={visibleProperties}
        >
          <CardItemGroup>
            {dbPage?.cover?.coverImage && (
              <div className="db-cover">
                <img
                  src={dbPage.cover.coverImage}
                  alt=""
                  className="db-cover__img"
                />
              </div>
            )}
            {attrs.views.length > 1 && !isOwnPage && <DatabaseTitleBar />}
            <div
              style={{
                maxWidth: "var(--db-editor-width)",
                paddingRight: 20,
                position: "relative",
              }}
            >
              <DatabaseToolbar />
              {db.views?.length > 0 && (showFilterChips || showSortChips) && (
                <Separator orientation="horizontal" />
              )}

              {attrs.id && <SelectionToolbar />}
            </div>

            {(showFilterChips || showSortChips) && (
              <CardItemGroup orientation="horizontal">
                {showFilterChips && <FilterRuleChips />}
                {showFilterChips &&
                  showSortChips &&
                  filterRuleCount > 0 &&
                  sortCount > 0 && (
                    <>
                      <Spacer orientation="horizontal" size={5} />
                      <Separator orientation="vertical" />
                      <Spacer orientation="horizontal" size={5} />
                    </>
                  )}
                {showSortChips && <SortRuleChips />}
              </CardItemGroup>
            )}

            {body}
          </CardItemGroup>
        </DatabaseProvider>
      </NodeViewWrapper>
    </NewRowEditProvider>
  );

  // ── Switching views → skeleton in the body slot ───────────────────────────
  // Chrome stays mounted so the toolbar and tabs don't flash. The skeleton uses
  // the TARGET view's shape, so it already looks like where you're going.
  if (switchingTo) {
    const target = attrs.views.find((v) => v.id === switchingTo);
    return chrome(<DatabaseLoadingSkeleton type={target?.type ?? "table"} />);
  }

  // ── View branches ─────────────────────────────────────────────────────────
  if (activeView?.type === "board") return chrome(<DatabaseBoardNodeView />);
  if (activeView?.type === "gallery")
    return chrome(<DatabaseGalleryNodeView />);
  if (activeView?.type === "list") return chrome(<DatabaseListNodeView />);
  if (activeView?.type === "calendar")
    return chrome(<DatabaseCalendarNodeView />);
  if (activeView?.type === "timeline")
    return chrome(<DatabaseTimelineNodeView />);

  // ── Table view (node-rendered) ────────────────────────────────────────────
  return chrome(
    <DatabaseTableBody
      tableRef={tableRef}
      gridTemplateColumns={gridTemplateColumns}
      bodyGridTemplateColumns={bodyGridTemplateColumns}
      widthFor={widthFor}
      onCommitColumnWidth={commitColumnWidth}
      collapsedKeys={collapsedKeys}
    />,
  );
}
