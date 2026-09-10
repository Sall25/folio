// The database NodeView. Responsibilities kept here are orchestration only:
//   - load the DataSource + view state
//   - call the focused hooks (records, view-switch, title, column layout,
//     bridge publish, node sync, chip visibility)
//   - assemble the chrome (cover, toolbar, title bar, filter/sort chips)
//   - branch to the six view renderers (table is node-rendered; the other five
//     are still imperative)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { usePage } from "src/hooks/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import { DatabaseToolbar } from "../components/database-toolbar";
import { DatabaseTitleBar } from "../components/database-title-bar";
import { DataSourcePicker } from "./data-source-picker";
import { DatabaseBoardNodeView } from "./database-board-node-view";
import { DatabaseGalleryNodeView } from "./database-gallery-node-view";
import { DatabaseListNodeView } from "./database-list-node-view/database-list-node-view";
import { DatabaseCalendarNodeView } from "./database-calendar-node-view";
import { DatabaseTimelineNodeView } from "./database-timeline-node-view";
import { DatabaseTableBody } from "./database-table-node";
import { useDatabaseColumnLayout } from "../hooks/use-database-column-layout";
import { useDatabaseBridgePublish } from "../hooks/use-database-bridge-publish";
import {
  useDatabaseSeed,
  useDatabaseCellSync,
  removeRecordNode,
} from "../hooks/use-database-seed";
import { useTableRecords } from "../hooks/use-table-records";
import { useViewSwitch } from "../hooks/use-view-switch";

import { type DatabaseAttrs, type ID, type DatabaseProperty } from "src/types";
import "./database-table-node-view.scss";
import "./database-node.scss";
import { SelectionToolbar } from "../components/selection-toolbar";
import {
  NewRowEditActionsProvider,
  NewRowEditStateProvider,
} from "./new-row-edit-provider";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import {
  useActiveViewFromHash,
  useBoardLayout,
  useDatabaseAlign,
  useListLayout,
  useMeasureViewDims,
  useSyncViews,
} from "../hooks";
import { ChipsRow } from "../components/chips-row";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { usePageViewState } from "src/components/tiptap-templates/simple/context/page-view-context";
import { setColumnHint } from "../utils/skeleton-hints";
import { DatabaseLoadingSkeletonWithDims } from "./database-loading-skeleton-with-dims";
import { useTableLayout } from "../hooks/use-table-layout";
import { useGalleryLayout } from "../hooks/use-gallery-layout";

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
  useEffect(() => {
    attrsRef.current = attrs;
  }, [attrs]);

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
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const activeView = db.activeView;

  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const { data: dbPage } = usePage(dbPageId);
  // Template page fetched here (once per database node), not in each cell.
  const { data: templatePage } = usePage(attrs.templateId ?? null);

  const tableRef = useRef<HTMLDivElement>(null);

  // ── Record open in peek/center view decoration
  const { target } = usePageViewState();
  useEffect(() => {
    if (!editor) return;
    const openId = target?.pageId ?? null;
    editor.commands.setOpenRecord(openId);
    // A record is open → the active-cell ring is redundant/noisy; clear it.
    // (It returns on the next cell click, or you could re-set it on close.)
    if (openId) editor.commands.clearActiveCell();
  }, [editor, target?.pageId]);

  // ── Database alignment
  useDatabaseAlign();

  // ── View switching (skeleton while a new view type mounts) ────────────────
  const { switchingTo, dbWithSwitch } = useViewSwitch(db, attrs.activeViewId);

  // ── Filtered → searched → sorted → grouped records + row layout ───────────
  const { sortedRecords, collapsedKeys } = useTableRecords({
    resolvedRecords,
    source,
    db,
    editingRecordId,
  });

  // ── View lifecycle  ────────────────────────────────────────────────
  useSyncViews({
    views: attrs.views,
    source,
    registerViewsAsync,
    unregisterViewsAsync,
  });

  // Activate a view from the URL hash (#view=…) once, on first load.
  useActiveViewFromHash({
    views: db.views,
    activeViewId: attrs.activeViewId,
    setActiveViewId: db.setActiveView,
  });

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

  // Record the real count as we render it
  if (source && visibleProperties.length) {
    setColumnHint(attrs.sourceId, visibleProperties.length);
  }

  // Both run (Rules of Hooks); the inactive one returns a flat/empty layout
  // cheaply since its view-type guard fails.
  const { tableLayout } = useTableLayout(sortedRecords, source ?? null, db);
  const { listLayout } = useListLayout(sortedRecords, source ?? null, db);
  const { boardLayout } = useBoardLayout(sortedRecords, source ?? null, db);
  const { galleryLayout } = useGalleryLayout(sortedRecords, db);

  // Publish the ACTIVE view's rowSlots so record nodes position correctly in
  // whichever view is hosting them (table or list — both node-render records).
  const activeRowSlots =
    activeView?.type === "list" ? listLayout.rowSlots : tableLayout.rowSlots;

  useDatabaseBridgePublish({
    editor,
    attrs,
    properties: source?.properties ?? EMPTY_PROPERTIES,
    activeView,
    locked,
    resolvedRecords,
    sortedRecords,
    draftWidths,
    rowSlots: activeRowSlots,
    hasSource: !!source,
    setCellValue: (recordId, propertyId, value) =>
      setCellValue(recordId, propertyId, value as never),
    templateCover: templatePage?.cover ?? null,
    boardLayout,
    galleryLayout,
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

  useMeasureViewDims(
    attrs.id,
    activeView?.type ?? "table",
    !isLoading && !!source,
  );

  const { activePageId } = useActivePageState();
  const isOwnPage = activePageId != null && activePageId === dbPageId;

  const actions = useMemo(() => ({ cancelEmptyRecord }), [cancelEmptyRecord]);
  const state = useMemo(() => ({ editingRecordId }), [editingRecordId]);

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

  // Skeleton shape, derived from what's available on the NODE (instant) plus the
  // cached column hint — no dependency on `source` having loaded.
  //   type    ← attrs.views (view definitions live on the node)
  //   columns ← last-known count for this source (falls back to the skeleton's
  //             own default when we've never successfully loaded it before)
  const skeletonView = attrs.views.find((v) => v.id === attrs.activeViewId);
  const skeletonType = skeletonView?.type ?? activeView?.type ?? "table";

  if (isLoading || !source) {
    return (
      <DatabaseLoadingSkeletonWithDims
        databaseId={attrs.id}
        type={skeletonType}
      />
    );
  }

  // ── Chrome wrapper shared by every view ───────────────────────────────────
  const chrome = (body: React.ReactNode) => (
    <NewRowEditActionsProvider value={actions}>
      <NewRowEditStateProvider value={state}>
        <NodeViewWrapper
          className="db-node"
          as="div"
          data-type="database"
          data-database-id={attrs.id}
          contentEditable={false}
        >
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
              <CardItemGroup className="top-level-block">
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
              </CardItemGroup>
              <CardItemGroup className="db-container">
                <div
                  style={{
                    maxWidth: "var(--db-editor-width)",
                    paddingRight: 20,
                    position: "relative",
                  }}
                >
                  <DatabaseToolbar />
                  <ChipsRow />

                  {attrs.id && <SelectionToolbar />}
                </div>
                <Spacer orientation="vertical" size={5} />

                {body}
              </CardItemGroup>
            </CardItemGroup>
          </DatabaseProvider>
        </NodeViewWrapper>
      </NewRowEditStateProvider>
    </NewRowEditActionsProvider>
  );

  // ── Switching views → skeleton in the body slot ───────────────────────────
  // Chrome stays mounted so the toolbar and tabs don't flash. The skeleton uses
  // the TARGET view's shape, so it already looks like where you're going. Source
  // is loaded here, so the real column count is known — use it.
  if (switchingTo) {
    const target = attrs.views.find((v) => v.id === switchingTo);
    return chrome(
      <DatabaseLoadingSkeletonWithDims
        databaseId={attrs.id}
        type={target?.type ?? "table"}
        switching={true}
      />,
    );
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
