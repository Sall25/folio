// The database NodeView. Responsibilities kept here are orchestration only:
//   - load the DataSource + view state
//   - call the focused hooks (title, column layout, bridge publish, node sync)
//   - assemble the chrome (cover, toolbar, title bar, filter/sort chips)
//   - branch to the six view renderers (table is node-rendered; the other five
//     are still imperative)
//
// The heavy logic lives in hooks (use-database-*.ts) and the table JSX lives in
// database-table-body.tsx / database-table-header.tsx.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { Ellipsis, Lock, Link as LinkIcon } from "lucide-react";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button } from "src/components/tiptap-ui-primitive/button";

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
import { DatabaseListNodeView } from "./database-list-node-view";
import { DatabaseCalendarNodeView } from "./database-calendar-node-view";
import { DatabaseTimelineNodeView } from "./database-timeline-node-view";
import { DatabaseLoadingSkeleton } from "../components/database-loading-skeleton";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";

import { DatabaseTableBody } from "./database-table-body";
import { useDatabaseTitle } from "../hooks/use-database-title";
import { useDatabaseColumnLayout } from "../hooks/use-database-column-layout";
import { useDatabaseBridgePublish } from "../hooks/use-database-bridge-publish";
import {
  useDatabaseSeed,
  useDatabaseCellSync,
  insertRecordNode,
} from "../hooks/use-database-seed";

import {
  DEFAULT_CONFIGS,
  type DatabaseAttrs,
  type DatabaseView,
  type PropertyConfig,
  type ID,
} from "src/types";
import "./database-table-node-view.scss";
import "./database-node.scss";
import { SelectionToolbar } from "../components/selection-toolbar";
import { useVisibleSelection } from "../hooks/use-visible-selection";
import { removeRecordNodes } from "../utils/remove-record-nodes";

type PropertyType = PropertyConfig["type"];

export function DatabaseNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const locked = !!attrs.locked;

  const { setTarget } = usePageView();

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
  } = useDataSource(attrs.sourceId);

  const db = useDatabase(
    attrs,
    updateAttributes,
    source ?? { properties: [] },
    updatePropertiesAsync,
    (title: string) => updateAttributes({ ...attrs, title }),
  );
  const activeView = db.activeView;

  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const { data: dbPage } = usePage(dbPageId);

  const tableRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // ── View switching ────────────────────────────────────────────────────────
  // Switching views shows a skeleton because mounting board/gallery/calendar is
  // expensive — but nothing is *loading* (the source is already in the query
  // cache), so there's no isLoading to key off. useTransition doesn't help
  // either: the update travels through a ProseMirror transaction rather than a
  // React setState, so React never scopes it as transition work. Hence an
  // explicit flag.
  const [switchingTo, setSwitchingTo] = useState<ID | null>(null);

  // Clear once the target view is actually active. rAF so the clear lands after
  // the new view's first paint rather than before it.
  useEffect(() => {
    if (switchingTo && attrs.activeViewId === switchingTo) {
      const raf = requestAnimationFrame(() => setSwitchingTo(null));
      return () => cancelAnimationFrame(raf);
    }
  }, [attrs.activeViewId, switchingTo]);

  const setActiveViewWithSkeleton = useCallback(
    (viewId: ID) => {
      if (viewId === attrs.activeViewId) return;
      setSwitchingTo(viewId);
      db.setActiveView(viewId);
    },
    [attrs.activeViewId, db],
  );

  // The toolbar and view tabs call db.setActiveView — wrapping it here means
  // those components need no changes.
  const dbWithSwitch = useMemo(
    () => ({ ...db, setActiveView: setActiveViewWithSkeleton }),
    [db, setActiveViewWithSkeleton],
  );

  // ── Filtered + sorted records ─────────────────────────────────────────────
  const sortedRecords = useMemo(() => {
    // The title's value lives on page.title, not in values[], so filters and
    // sorts need the property list to know which id is the title.
    const props = source?.properties ?? [];
    const filtered = activeView?.filters?.length
      ? resolvedRecords.filter((r) =>
          recordMatchesFilters(r, activeView.filters, props),
        )
      : resolvedRecords;
    return sortRecords(filtered, activeView?.sorts ?? [], props);
  }, [
    resolvedRecords,
    activeView?.filters,
    activeView?.sorts,
    source?.properties,
  ]);

  // Ids in view order — the visible-selection intersection needs a stable
  // array identity, so memo it rather than mapping inline.
  const sortedRecordIds = useMemo(
    () => sortedRecords.map((r) => r.id),
    [sortedRecords],
  );

  // Selection ∩ visible rows. Selection survives filter changes, so a record
  // can stay selected while filtered out — bulk actions must only touch what
  // the user can see.
  const visibleSelection = useVisibleSelection(
    attrs.id ?? null,
    sortedRecordIds,
  );
  const selectedRecords = useMemo(
    () => sortedRecords.filter((r) => visibleSelection.includes(r.id)),
    [sortedRecords, visibleSelection],
  );

  // Register present views (existing effect)
  useEffect(() => {
    if (!source) return;
    registerViewsAsync(attrs.views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, registerViewsAsync]);

  // Prune saved views that were deleted from the node
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

  // ── Focused hooks ─────────────────────────────────────────────────────────
  const { resolvedTitle, handleTitleChange } = useDatabaseTitle({
    attrs,
    sourceName: source?.name,
    sourcePageId: source?.pageId,
    updateSourceMetaAsync,
    updateAttributes: (patch) => updateAttributes({ ...attrs, ...patch }),
  });

  const {
    draftWidths,
    visibleProperties,
    widthFor,
    gridTemplateColumns,
    bodyGridTemplateColumns,
    commitColumnWidth,
  } = useDatabaseColumnLayout({
    properties: source?.properties ?? [],
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onUpdateView = (patch: Partial<DatabaseView>) => {
    if (activeView) db.updateView(activeView.id, patch);
  };

  const newRecord = () => {
    addRecordAsync({ title: "" })
      .then((page) => {
        if (editor && attrs.id && attrs.sourceId) {
          insertRecordNode(
            editor,
            attrs.id,
            attrs.sourceId,
            page,
            source.properties,
          );
        }
        setTarget({ pageId: page.id, view: "Peek" });
      })
      .catch(() => console.log("Failed to create page"));
  };

  const addProperty = (type: PropertyType, propertyName?: string) => {
    if (locked) return;
    updatePropertiesAsync([
      ...source.properties,
      {
        id: crypto.randomUUID(),
        name: propertyName ?? type.charAt(0).toUpperCase() + type.slice(1),
        config: DEFAULT_CONFIGS[type],
        width: 160,
      },
    ]);
    // Cells for the new property are inserted by useDatabaseCellSync.
  };

  const optionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card
          style={{
            padding: "5px",
            minWidth: 200,
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardItemGroup
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() =>
                  updateAttributes({ ...attrs, locked: !attrs.locked })
                }
              >
                <Lock className="tiptap-button-icon" />
                <span className="tiptap-button-text">
                  {locked ? "Unlock database" : "Lock database"}
                </span>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => {
                  const pageId = source.pageId ?? attrs.pageId;
                  if (pageId == null) return;
                  navigator.clipboard.writeText(
                    `${window.location.origin}/page/${pageId}#view=${
                      activeView?.id ?? ""
                    }`,
                  );
                }}
              >
                <LinkIcon className="tiptap-button-icon" />
                <span className="tiptap-button-text">Copy link to view</span>
              </Button>
            </DropdownMenuItem>
          </CardItemGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Chrome wrapper shared by every view ───────────────────────────────────
  const chrome = (body: React.ReactNode) => (
    <NodeViewWrapper
      className="db-node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <DatabaseProvider
        attrs={attrs}
        // Switch-aware db so view tabs anywhere downstream trigger the skeleton.
        db={dbWithSwitch}
        source={source}
        editor={editor}
        updateAttributes={updateAttributes}
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
          {attrs.views.length > 1 && (
            <DatabaseTitleBar
              hideTitle={attrs.hideTitle}
              title={resolvedTitle}
              onTitleChange={handleTitleChange}
              onHideTitleChange={(hide) =>
                locked
                  ? undefined
                  : updateAttributes({ ...attrs, hideTitle: hide })
              }
              locked={locked}
            />
          )}
          <div
            style={{
              maxWidth: "var(--db-editor-width)",
              paddingRight: 20,
              position: "relative",
            }}
          >
            <DatabaseToolbar
              properties={source.properties}
              attrs={attrs}
              db={dbWithSwitch}
              onUpdateAttributes={updateAttributes}
              locked={locked}
              hovered={hovered}
              title={resolvedTitle}
              hideTitle={attrs.hideTitle}
              onTitleChange={handleTitleChange}
              onHideTitleChange={(hide) =>
                locked
                  ? undefined
                  : updateAttributes({ ...attrs, hideTitle: hide })
              }
            />
            {attrs.id && (
              <SelectionToolbar
                databaseId={attrs.id}
                recordIds={visibleSelection}
                records={selectedRecords}
                properties={source.properties}
                onSetValue={(propertyId, value) =>
                  visibleSelection.forEach((id) =>
                    setCellValue(id, propertyId, value as never),
                  )
                }
                onDelete={() => {
                  if (editor && attrs.id) {
                    removeRecordNodes(editor, attrs.id, visibleSelection);
                  }
                }}
              />
            )}
          </div>

          <CardItemGroup orientation="horizontal">
            <FilterRuleChips
              properties={source.properties}
              db={db}
              activeView={activeView}
              locked={locked}
            />
            {activeView && activeView.sorts?.length > 0 && (
              <>
                <Spacer orientation="horizontal" size={5} />
                <Separator orientation="vertical" />
                <Spacer orientation="horizontal" size={5} />
              </>
            )}
            <SortRuleChips
              properties={source.properties}
              db={db}
              activeView={activeView}
              sorts={activeView?.sorts ?? []}
            />
          </CardItemGroup>
          {body}
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );

  // ── Switching views → skeleton in the body slot ───────────────────────────
  // Chrome stays mounted so the toolbar and tabs don't flash. The skeleton uses
  // the TARGET view's shape, so it already looks like where you're going.
  if (switchingTo) {
    const target = attrs.views.find((v) => v.id === switchingTo);
    return chrome(<DatabaseLoadingSkeleton type={target?.type ?? "table"} />);
  }

  // ── View branches ─────────────────────────────────────────────────────────
  if (activeView?.type === "board")
    return chrome(
      <DatabaseBoardNodeView
        view={db.activeView}
        attrs={attrs}
        source={source}
      />,
    );
  if (activeView?.type === "gallery")
    return chrome(
      <DatabaseGalleryNodeView
        view={db.activeView}
        attrs={attrs}
        source={source}
      />,
    );
  if (activeView?.type === "list")
    return chrome(
      <DatabaseListNodeView
        view={db.activeView}
        attrs={attrs}
        source={source}
        onUpdateView={onUpdateView}
      />,
    );
  if (activeView?.type === "calendar")
    return chrome(<DatabaseCalendarNodeView attrs={attrs} source={source} />);
  if (activeView?.type === "timeline")
    return chrome(
      <DatabaseTimelineNodeView
        attrs={attrs}
        source={source}
        onUpdateView={onUpdateView}
      />,
    );

  // ── Table view (node-rendered) ────────────────────────────────────────────
  return chrome(
    <DatabaseTableBody
      tableRef={tableRef}
      locked={locked}
      hovered={hovered}
      visibleProperties={visibleProperties}
      allProperties={source.properties}
      activeView={activeView}
      sortedRecords={sortedRecords}
      gridTemplateColumns={gridTemplateColumns}
      bodyGridTemplateColumns={bodyGridTemplateColumns}
      widthFor={widthFor}
      optionsMenu={optionsMenu}
      onReorder={(orderedIds) => db.reorderProperties(orderedIds)}
      onAddProperty={addProperty}
      onCommitColumnWidth={commitColumnWidth}
      onNewRecord={newRecord}
      databaseId={attrs.id}
    />,
  );
}
