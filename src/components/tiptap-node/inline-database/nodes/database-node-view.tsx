import type { JSONContent, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useRef, useEffect, useState, type CSSProperties } from "react";
import { Ellipsis, Plus } from "lucide-react";
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
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";
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
import { PROPERTY_TYPE_ICONS } from "../types/property-type-meta";
import { Cell } from "../components/cells/cell";
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
  CellValue,
} from "../types/types";
import "./database-table-node-view.scss";
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
  const attrs = node.attrs as DatabaseAttrs & {
    sourceId?: string | null;
    pageId?: number | null;
  };

  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });

  const { addPageAsync, pages, updatePageAsync } = usePages();
  const {
    source,
    isLoading,
    setCellValue,
    addRecordWithPageAsync,
    updatePropertiesAsync,
    updateSourceMetaAsync,
  } = useDataSource(attrs.sourceId);

  // ── Draft column widths ──────────────────────────────────────────────────
  // Populated only during an active resize drag. The grid template reads
  // draft-first so the resize is reflected live without any network writes.
  // Cleared after the commit lands in `source` (see onResizeEnd) so the
  // column never snaps back to the stale width on release.
  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});

  // Guards against onResizeEnd double-firing (some pointer setups fire
  // mouseup twice). Drops an identical immediate repeat commit.
  const lastCommitRef = useRef<{ propId: string; width: number } | null>(null);

  // debounced persistence of the title to source.name + the database page
  const persistTitle = useDebouncedCallback(
    (title: string) => {
      // source name
      updateSourceMetaAsync({ name: title });

      // the database's own page (title field + first content node)
      const dbPageId = source?.pageId ?? attrs.pageId ?? null;
      if (dbPageId != null && pages) {
        const dbPage = findPage(pages, dbPageId);
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
          updatePageAsync({ ...dbPage, title, content: updatedContent });
        }
      }
    },
    600,
    { maxWait: 2000 },
  );
  const handleTitleChange = (title: string) => {
    // live: node attr updates immediately so the input stays responsive
    updateAttributes({ ...attrs, title });
    // debounced: source + page persistence
    persistTitle(title);
  };

  const db = useDatabase(
    attrs,
    updateAttributes,
    source ?? { properties: [] },
    updatePropertiesAsync,
    onUpdateTitle,
  );

  const [dragX, setDragX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);

  // resolve the database page early — works whether or not source is loaded yet
  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const dbPage =
    dbPageId != null && pages ? (findPage(pages, dbPageId) ?? null) : null;

  const tableRef = useRef<HTMLDivElement>(null);
  const [activeColId, setActiveColId] = useState<string | null>(null);

  // ── Live resize: write draft width only, NO network call ──────────────────
  // The ResizeObserver in PropertyHeader dispatches `column:resize` continuously
  // during a drag. Previously this fired updatePropertiesAsync per tick, flooding
  // the source endpoint with racing mutations. Now it only updates local draft
  // state; the single persistence happens in onResizeEnd.
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { propId, width } = (e as CustomEvent).detail as {
        propId: string;
        width: number;
      };
      setDraftWidths((d) => ({ ...d, [propId]: width }));
    };
    el.addEventListener("column:resize", handler);
    return () => el.removeEventListener("column:resize", handler);
  }, []); // no source dep — handler only touches local state

  // inside DatabaseNodeView, table view:
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleProperties.findIndex((p) => p.id === active.id);
    const newIndex = visibleProperties.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(visibleProperties, oldIndex, newIndex).map(
      (p) => p.id,
    );
    // reorderProperties keeps any properties not in the list at the end —
    // pass full source order so hidden props don't get dropped
    const visibleSet = new Set(reordered);
    const hidden = source?.properties
      .filter((p) => !visibleSet.has(p.id))
      .map((p) => p.id);
    if (!hidden) return;
    db.reorderProperties([...reordered, ...hidden]);
  };

  // ── No source yet → picker ────────────────────────────────────────────────
  if (!attrs.sourceId) {
    return (
      <NodeViewWrapper as="div" data-type="database" contentEditable={false}>
        <DataSourcePicker
          onSelect={(sourceId, pageId) =>
            updateAttributes({
              ...attrs,
              sourceId,
              pageId: pageId ?? attrs.pageId ?? null,
            })
          }
        />
      </NodeViewWrapper>
    );
  }

  if (isLoading || !source) {
    return (
      <NodeViewWrapper as="div" data-type="database">
        <div className="db-empty-state">Loading…</div>
      </NodeViewWrapper>
    );
  }

  // Records parent under the database page
  const recordParentId = dbPageId;

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as DatabaseView | undefined;

  const onUpdateView = (patch: Partial<DatabaseView>) => {
    if (!activeView) return;
    db.updateView(activeView.id, patch);
  };

  const newRecord = () =>
    addRecordWithPageAsync({
      title: "",
      parentPageId: recordParentId,
      createPage: addPageAsync,
    });

  // ── Shared chrome ───────────────────────────────────────────────────────
  const chrome = (body: React.ReactNode) => (
    <NodeViewWrapper>
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
              attrs={attrs}
              db={db}
              onUpdateAttributes={updateAttributes}
            />
          </div>
          <DatabaseTitleBar
            hideTitle={attrs.hideTitle}
            title={attrs.title}
            onTitleChange={handleTitleChange}
            onHideTitleChange={(hide) =>
              updateAttributes({ ...attrs, hideTitle: hide })
            }
          />
          <CardItemGroup orientation="horizontal">
            <FilterRuleChips attrs={attrs} db={db} activeView={activeView} />
            {activeView && activeView.sorts.length > 0 && (
              <>
                <Spacer orientation="horizontal" size={5} />
                <Separator orientation="vertical" />
                <Spacer orientation="horizontal" size={5} />
              </>
            )}
            <SortRuleChips
              attrs={attrs}
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

  // ── Non-table views ──────────────────────────────────────────────────────
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

  // ── Table view ─────────────────────────────────────────────────────────
  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const visibleProperties = source.properties.filter((p) => !hidden.has(p.id));

  // draft-first width: the live drag value wins, falling back to the persisted
  // width, falling back to the default. Every row reads gridTemplateColumns, so
  // setting a draft width reflects across header + all body rows automatically.
  const widthFor = (p: DatabaseProperty) => draftWidths[p.id] ?? p.width ?? 160;
  const activeIndex = activeColId
    ? visibleProperties.findIndex((p) => p.id === activeColId)
    : -1;
  const overIndex = overId
    ? visibleProperties.findIndex((p) => p.id === overId)
    : -1;

  // width of the column being dragged
  const activeWidth =
    activeIndex >= 0 ? widthFor(visibleProperties[activeIndex]) : 0;

  const shiftFor = (i: number): number => {
    if (activeIndex < 0 || overIndex < 0 || i === activeIndex) return 0;
    // dragging right: columns between (active, over] move LEFT by activeWidth
    if (activeIndex < overIndex && i > activeIndex && i <= overIndex) {
      return -activeWidth;
    }
    // dragging left: columns between [over, active) move RIGHT by activeWidth
    if (activeIndex > overIndex && i >= overIndex && i < activeIndex) {
      return activeWidth;
    }
    return 0;
  };

  const gridTemplateColumns =
    visibleProperties.map((p) => `${widthFor(p)}px`).join(" ") + " 1fr";

  const frozenId = activeView?.frozenPropertyId ?? null;
  const freezeIndex = frozenId
    ? visibleProperties.findIndex((p) => p.id === frozenId)
    : -1;

  // cumulative left offset per column, accumulating through the freeze boundary.
  // Uses widthFor so a frozen column's sticky offset stays correct mid-drag.
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
      zIndex: 2,
      background: "var(--tt-bg-color)",
      borderRight: isBoundary ? "2px solid var(--tt-border-color)" : undefined,
    };
  };

  const addProperty = (type: PropertyType) =>
    updatePropertiesAsync([
      ...source.properties,
      {
        id: crypto.randomUUID(),
        name: type.charAt(0).toUpperCase() + type.slice(1),
        config: { type } as PropertyConfig,
        width: 160,
      },
    ]);

  // ── Commit a resize once, on release ──────────────────────────────────────
  // - guards against double-fire (identical immediate repeat is dropped)
  // - awaits the source update, THEN clears the draft, so the column doesn't
  //   snap back to the stale width during the async round-trip
  const commitColumnWidth = async (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => {
    const propId = (ref?.current as HTMLElement | null)?.dataset.propId;
    if (!propId) return;

    const last = lastCommitRef.current;
    if (last && last.propId === propId && last.width === width) {
      // identical immediate repeat → drop (double-fire guard)
      return;
    }
    lastCommitRef.current = { propId, width };

    await updatePropertiesAsync(
      source.properties.map((p) => (p.id === propId ? { ...p, width } : p)),
    );

    // commit landed in source → safe to drop the draft for this column
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
      contentEditable={false}
    >
      <div className="db-header-row" style={{ gridTemplateColumns }}>
        <DndContext
          sensors={sensors}
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
                />
              </ResizableNodeProvider>
            ))}
          </SortableContext>
        </DndContext>
        {/* actions cell stays outside SortableContext — not reorderable */}
        <CardItemGroup
          orientation="horizontal"
          className="db-header-cell db-header-cell--actions"
        >
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
                style={{ maxHeight: 300, overflow: "scroll", minWidth: 300 }}
              >
                <CardHeader>
                  <CardGroupLabel>Properties</CardGroupLabel>
                </CardHeader>
                <CardBody style={{ width: "100%", padding: "0 5px" }}>
                  <Grid columns="1fr 1fr 1fr 1fr" gap={10}>
                    {chunk(allPropertyTypes, 4).map((row, i) => (
                      <GridRow key={i}>
                        {row.map((t) => {
                          const Icon = PROPERTY_TYPE_ICONS[t];
                          return (
                            <GridCell
                              key={t}
                              style={{
                                padding: "5px 10px",
                              }}
                            >
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
                                <span className="tiptap-button-text">{t}</span>
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
          <Button variant="ghost">
            <Ellipsis className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
      </div>

      <div className="db-grid" style={{ display: "grid", gridTemplateColumns }}>
        {source.records.map((record) => (
          <div key={`${record.id}`} style={{ display: "contents" }}>
            {/**
style={{
 
}} */}
            {visibleProperties.map((prop, i) => {
              const shift = shiftFor(i);
              return (
                <div
                  key={`${record.id}:${prop.id}`}
                  data-row-id={record.id}
                  style={{
                    borderRight: "1px solid var(--tt-border-color)",
                    borderBottom: "1px solid var(--tt-border-color)",
                    display: "block",
                    overflow: "hidden",
                    ...stickyStyle(i),
                    transform:
                      activeColId === prop.id
                        ? `translate3d(${dragX}px,0,0)`
                        : shift
                          ? `translate3d(${shift}px,0,0)`
                          : undefined,
                    transition:
                      activeColId === prop.id
                        ? undefined
                        : "transform 0.15s ease",
                    ...(activeColId === prop.id && {
                      background: "var(--tt-bg-color)",
                      zIndex: 3,
                    }),
                  }}
                >
                  <Cell
                    property={prop}
                    value={(record.values[prop.id] ?? null) as CellValue | null}
                    record={record}
                    templateId={attrs.templateId}
                    columnValues={source.records.map(
                      (r) => (r.values[prop.id] ?? null) as CellValue,
                    )}
                    onChange={(v) => setCellValue(record.id, prop.id, v)}
                    unwrapped={db.isUnwrapped(db.activeView.id, prop.id)}
                    view={db.activeView}
                  />
                </div>
              );
            })}
            <div className="db-header-cell--actions"></div>
          </div>
        ))}
      </div>

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

      <DatabaseCalculations
        properties={visibleProperties}
        records={source.records}
        gridTemplateColumns={gridTemplateColumns}
      />
    </NodeViewWrapper>,
  );
}
