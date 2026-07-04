import type { JSONContent, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  type CSSProperties,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Lock,
  Link as LinkIcon,
  Plus,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePage, usePages } from "src/hooks/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import { DatabaseToolbar } from "../components/database-toolbar";
import { DatabaseTitleBar } from "../components/database-title-bar";
import { FilterRuleChips } from "../components/filter-rule-chips";
import { SortRuleChips } from "../components/sort-rule-chips/sort-rule-chips";
import { PropertyHeader } from "../components/property-header";
import { DatabaseCalculations } from "../components/database-calculations";
import { ResizableNodeProvider } from "../../figure-node";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { DataSourcePicker } from "./data-source-picker";
import { DatabaseBoardNodeView } from "./database-board-node-view";
import { DatabaseGalleryNodeView } from "./database-gallery-node-view";
import { DatabaseListNodeView } from "./database-list-node-view";
import { DatabaseCalendarNodeView } from "./database-calendar-node-view";
import { DatabaseTimelineNodeView } from "./database-timeline-node-view";
import type {
  DatabaseAttrs,
  DatabaseView,
  DatabaseProperty,
  PropertyConfig,
} from "src/types";
import "./database-table-node-view.scss";
import "./database-node.scss";
import { useDebouncedCallback } from "use-debounce";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";

import { chunk } from "lodash";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { DatabaseLoadingSkeleton } from "../components/database-loading-skeleton";
import { usePublishDatabaseData } from "../hooks/use-database-bridge-data";
import type { DatabaseBridgeData } from "../utils/database-bridge";
import { useDatabaseSeed, insertRecordNode } from "../hooks/use-database-seed";

type PropertyType = PropertyConfig["type"];

const allPropertyTypes = [
  "title",
  "text",
  "checkbox",
  "created_time",
  "created_by",
  "edited_time",
  "edited_by",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "formula",
  "relation",
  "rollup",
  "url",
  "phone",
  "email",
] as const satisfies readonly PropertyType[];

export function DatabaseNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;

  const { setTarget } = usePageView();

  const locked = !!attrs.locked;

  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const { data: pages } = usePages();
  const pagesRef = useRef(pages);

  useEffect(() => void (pagesRef.current = pages), [pages]);
  const {
    source,
    isLoading,
    setCellValue,
    updatePropertiesAsync,
    updateSourceMetaAsync,
    registerViewsAsync,
    resolvedRecords,
    addRecordAsync,
  } = useDataSource(attrs.sourceId);

  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});
  const lastCommitRef = useRef<{ propId: string; width: number } | null>(null);

  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const persistTitle = useDebouncedCallback(
    (title: string) => {
      updateSourceMetaAsync({ name: title });
      const dbPageId = source?.pageId ?? attrs.pageId ?? null;
      if (dbPageId != null && pagesRef.current) {
        const dbPage = pagesRef.current.find((p) => p.id === dbPageId);
        if (dbPage) {
          const content = dbPage.content as JSONContent;
          const updatedContent: JSONContent = content.content?.length
            ? {
                ...content,
                content: content.content.map((n, i) =>
                  i !== 0
                    ? n
                    : { ...n, content: [{ type: "text", text: title }] },
                ),
              }
            : content;
          mutatePage.mutateAsync({
            id: dbPageId,
            patch: { title, content: updatedContent },
          });
        }
      }
    },
    300,
    { maxWait: 600 },
  );
  const isLinked = !!attrs.isLinked;
  const resolvedTitle = attrs.title || source?.name || "";

  const handleTitleChange = (title: string) => {
    if (isLinked) {
      updateAttributes({ ...attrs, title });
      return;
    }
    updateAttributes({ ...attrs, title });
    persistTitle(title);
  };

  const db = useDatabase(
    attrs,
    updateAttributes,
    source ?? { properties: [] },
    updatePropertiesAsync,
    onUpdateTitle,
  );

  const activeView = db.activeView;

  const sortedRecords = useMemo(() => {
    const filtered = activeView?.filters?.length
      ? resolvedRecords.filter((r) =>
          recordMatchesFilters(r, activeView.filters),
        )
      : resolvedRecords;
    return sortRecords(filtered, activeView?.sorts ?? []);
  }, [resolvedRecords, activeView?.filters, activeView?.sorts]);

  useEffect(() => {
    if (!source) return;
    registerViewsAsync(attrs.views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, registerViewsAsync]);

  const [, /*dragX*/ setDragX] = useState(0);
  const [, /*overId*/ setOverId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const { data: dbPage } = usePage(dbPageId);
  const tableRef = useRef<HTMLDivElement>(null);
  const [, /*activeColId*/ setActiveColId] = useState<string | null>(null);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      if (locked) return;
      const { propId, width } = (e as CustomEvent).detail as {
        propId: string;
        width: number;
      };
      setDraftWidths((d) => ({ ...d, [propId]: width }));
    };
    el.addEventListener("column:resize", handler);
    return () => el.removeEventListener("column:resize", handler);
  }, [locked]);

  const hashActivatedRef = useRef(false);
  useEffect(() => {
    if (hashActivatedRef.current || db.views?.length === 0) return;
    hashActivatedRef.current = true;
    const m = window.location.hash.match(/view=([^&]+)/);
    const viewId = m?.[1];
    if (
      viewId &&
      db.views.some((v) => v.id === viewId) &&
      viewId !== attrs.activeViewId
    ) {
      db.setActiveView(viewId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.views?.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Column layout (computed early so context + header + grid all share it) ─
  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const visibleProperties = (source?.properties ?? []).filter(
    (p) => !hidden.has(p.id),
  );

  const widthFor = (p: DatabaseProperty) => draftWidths[p.id] ?? p.width ?? 160;

  // Header grid: property columns + a trailing 1fr for the actions (+/...) cell.
  const gridTemplateColumns =
    visibleProperties.map((p) => `${widthFor(p)}px`).join(" ") + " 1fr";

  // BODY grid: EXACTLY one column per property. Records render as
  // display:contents, so the grid flows all cells continuously — it can only
  // keep rows intact if column count === cells-per-record (= property count).
  // A trailing 1fr would add an extra column with no matching cell, drifting
  // every subsequent record diagonally.
  const bodyGridTemplateColumns = visibleProperties
    .map((p) => `${widthFor(p)}px`)
    .join(" ");

  // ── Context for the cell/record NodeViews ──────────────────────────────────
  const recordsById = useMemo(
    () => new Map((source ? resolvedRecords : []).map((r) => [r.id, r])),
    [resolvedRecords, source],
  );

  const columnWidthByProp = useMemo(() => {
    const out: Record<string, number> = {};
    (source?.properties ?? []).forEach((p) => {
      out[p.id] = draftWidths[p.id] ?? p.width ?? 160;
    });
    return out;
  }, [source?.properties, draftWidths]);

  const columnValuesByProp = useMemo(() => {
    const out: Record<string, unknown[]> = {};
    (source?.properties ?? []).forEach((p) => {
      out[p.id] = sortedRecords.map((r) => r.values?.[p.id] ?? null);
    });
    return out;
  }, [source?.properties, sortedRecords]);

  const bridgeData: DatabaseBridgeData = useMemo(
    () => ({
      sourceId: attrs.sourceId ?? null,
      properties: source?.properties ?? [],
      view: activeView,
      locked,
      templateId: attrs.templateId,
      recordsById,
      columnWidthByProp,
      setCellValue: (recordId, propertyId, value) =>
        setCellValue(recordId, propertyId, value as never),
      columnValuesByProp:
        columnValuesByProp as DatabaseBridgeData["columnValuesByProp"],
    }),
    [
      attrs.sourceId,
      attrs.templateId,
      source?.properties,
      activeView,
      locked,
      recordsById,
      columnWidthByProp,
      columnValuesByProp,
      setCellValue,
    ],
  );

  usePublishDatabaseData(editor, attrs.id ?? null, bridgeData);

  // ── Seed record/cell nodes once, at creation (or first open of an existing
  // database with no rows yet). No runtime reconciler — the node tree is
  // authored, then kept in sync by targeted insert/delete on row ops. ───────
  useDatabaseSeed({
    editor,
    databaseId: attrs.id ?? null,
    sourceId: attrs.sourceId ?? null,
    records: resolvedRecords,
    properties: source?.properties ?? [],
    ready: !isLoading && !!source,
  });

  const onDragEnd = (e: DragEndEvent) => {
    if (locked) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleProperties.findIndex((p) => p.id === active.id);
    const newIndex = visibleProperties.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(visibleProperties, oldIndex, newIndex).map(
      (p) => p.id,
    );
    const visibleSet = new Set(reordered);
    const hiddenIds = source?.properties
      .filter((p) => !visibleSet.has(p.id))
      .map((p) => p.id);
    if (!hiddenIds) return;
    db.reorderProperties([...reordered, ...hiddenIds]);
  };

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
                ? {
                    views: [savedView],
                    activeViewId: savedView.id,
                  }
                : {}),
            })
          }
        />
      </NodeViewWrapper>
    );
  }
  if (isLoading || !source) {
    return <DatabaseLoadingSkeleton />;
  }

  const onUpdateView = (patch: Partial<DatabaseView>) => {
    if (!activeView) return;
    db.updateView(activeView.id, patch);
  };

  const newRecord = () => {
    addRecordAsync({ title: "" })
      .then((page) => {
        // Keep the node tree in sync: insert the matching record node.
        if (editor && attrs.id && attrs.sourceId) {
          insertRecordNode(
            editor,
            attrs.id,
            attrs.sourceId,
            page,
            source?.properties ?? [],
          );
        }
        setTarget({ pageId: page.id, view: "Peek" });
      })
      .catch(() => console.log("Failed to create page"));
  };

  const toggleLock = () =>
    updateAttributes({ ...attrs, locked: !attrs.locked });

  const copyLinkToView = () => {
    const pageId = source?.pageId ?? attrs.pageId;
    if (pageId == null) return;
    const url = `${window.location.origin}/page/${pageId}#view=${
      activeView?.id ?? ""
    }`;
    navigator.clipboard.writeText(url);
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
                onClick={toggleLock}
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
                onClick={copyLinkToView}
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

  const chrome = (body: React.ReactNode) => (
    <NodeViewWrapper
      className="db-node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <DatabaseProvider
        attrs={attrs}
        db={db}
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
          <div style={{ maxWidth: "var(--db-editor-width)", paddingRight: 20 }}>
            <DatabaseToolbar
              properties={source.properties}
              attrs={attrs}
              db={db}
              onUpdateAttributes={updateAttributes}
              locked={locked}
              hovered={hovered}
            />
          </div>
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

  // ── Non-table views (unchanged — still imperative) ────────────────────────
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

  // ── Table view (NODE-RENDERED body) ───────────────────────────────────────
  const frozenId = activeView?.frozenPropertyId ?? null;
  const freezeIndex = frozenId
    ? visibleProperties.findIndex((p) => p.id === frozenId)
    : -1;

  const leftOffsets: number[] = [];
  let acc = 0;
  visibleProperties.forEach((p, i) => {
    leftOffsets[i] = acc;
    if (i <= freezeIndex) acc += widthFor(p);
  });

  const stickyStyle = (i: number): React.CSSProperties => {
    if (i > freezeIndex) return {};
    const isBoundary = i === freezeIndex;
    return {
      position: "sticky",
      left: leftOffsets[i],
      zIndex: 8,
      background: "var(--tt-bg-color)",
      overflow: "hidden",
      borderRight: isBoundary ? "2px solid var(--tt-border-color)" : undefined,
    };
  };

  const addProperty = (type: PropertyType) => {
    if (locked) return;
    updatePropertiesAsync([
      ...source.properties,
      {
        id: crypto.randomUUID(),
        name: type.charAt(0).toUpperCase() + type.slice(1),
        config: { type } as PropertyConfig,
        width: 160,
      },
    ]);
  };

  const commitColumnWidth = async (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => {
    if (locked) return;
    const propId = (ref?.current as HTMLElement | null)?.dataset.propId;
    if (!propId) return;

    const last = lastCommitRef.current;
    if (last && last.propId === propId && last.width === width) return;
    lastCommitRef.current = { propId, width };

    await updatePropertiesAsync(
      source.properties.map((p) => (p.id === propId ? { ...p, width } : p)),
    );

    setDraftWidths((d) => {
      if (!(propId in d)) return d;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [propId]: _drop, ...rest } = d;
      return rest;
    });
  };

  return chrome(
    <NodeViewWrapper
      as={"div"}
      ref={tableRef}
      className="db-table"
      data-type="database-table"
      data-locked={locked ? "true" : "false"}
    >
      {/* Header row — stays imperative (it's schema, not record data). */}
      <div
        className="db-header-row"
        contentEditable={false}
        style={{ gridTemplateColumns }}
      >
        <DndContext
          sensors={locked ? [] : sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveColId(String(e.active.id))}
          onDragMove={(e) => setDragX(e.delta.x)}
          onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
          onDragEnd={(e) => {
            setActiveColId(null);
            setOverId(null);
            setDragX(0);
            onDragEnd(e);
          }}
          onDragCancel={() => {
            setActiveColId(null);
            setOverId(null);
            setDragX(0);
          }}
        >
          <SortableContext
            items={visibleProperties.map((p) => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            {visibleProperties.map((prop, i) => (
              <ResizableNodeProvider
                key={prop.id}
                onResizeEnd={({ width }, ref) =>
                  void commitColumnWidth(ref, width)
                }
              >
                <PropertyHeader
                  prop={prop}
                  style={stickyStyle(i) as Partial<CSSProperties>}
                  locked={locked}
                />
              </ResizableNodeProvider>
            ))}
          </SortableContext>
        </DndContext>

        <CardItemGroup orientation="horizontal" className="db-header-cell ">
          {!locked && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  style={{ background: "transparent" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Plus className="tiptap-button-icon" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Card
                  style={{
                    maxHeight: 300,
                    overflow: "scroll",
                    minWidth: 300,
                    padding: "10px 5px",
                  }}
                >
                  <CardHeader>
                    <CardGroupLabel>Properties</CardGroupLabel>
                  </CardHeader>
                  <CardBody style={{ width: "100%" }}>
                    <Grid columns="1fr 1fr 1fr" gap={10}>
                      {chunk(allPropertyTypes, 3).map((row, i) => (
                        <GridRow key={i}>
                          {row.map((t) => {
                            const Icon = PROPERTY_TYPE_ICONS[t];
                            return (
                              <GridCell key={t} style={{ padding: "5px 10px" }}>
                                <Button
                                  variant="ghost"
                                  style={{
                                    borderRadius: "var(--tt-radius-sm)",
                                    width: "100%",
                                    justifyContent: "flex-start",
                                  }}
                                  onClick={() => addProperty(t)}
                                >
                                  <Icon className="tiptap-button-icon" />
                                  <span className="tiptap-button-text">
                                    {t}
                                  </span>
                                </Button>
                              </GridCell>
                            );
                          })}
                        </GridRow>
                      ))}
                    </Grid>
                  </CardBody>
                </Card>
              </PopoverContent>
            </Popover>
          )}
          {optionsMenu}
        </CardItemGroup>
      </div>

      {/* Body — ProseMirror renders databaseRecord > databaseCell here, in
            document order (the reconciler keeps that = sorted order). */}
      <div
        className="db-node-grid"
        style={{
          display: "grid",
          gridTemplateColumns: bodyGridTemplateColumns,
        }}
      >
        <NodeViewContent as="div" className="db-node-grid__body" />
      </div>

      {/* New record — unchanged. */}
      <div
        contentEditable={false}
        style={{
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <Button
          variant="ghost"
          style={{
            justifyContent: "flex-start",
            borderRadius: "var(--tt-radius-sm)",
            fontSize: 12,
          }}
          onClick={newRecord}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">New</span>
        </Button>
      </div>

      <div contentEditable={false}>
        <DatabaseCalculations
          properties={visibleProperties}
          records={sortedRecords}
          gridTemplateColumns={gridTemplateColumns}
        />
      </div>
    </NodeViewWrapper>,
  );
}
