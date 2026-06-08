import type { JSONContent, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
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
import { groupRecords } from "../utils/group-records";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { Badge } from "src/components/tiptap-ui-primitive/badge";

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

  // Notion-style lock: structure/layout/view-config is frozen, but cell
  // values and add/delete record stay editable. This protects a shared or
  // published database from accidental restructuring while still letting
  // people fill in data.
  const locked = !!attrs.locked;

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
    registerViewsAsync,
    resolvedRecords,
  } = useDataSource(attrs.sourceId);

  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});
  const lastCommitRef = useRef<{ propId: string; width: number } | null>(null);

  const persistTitle = useDebouncedCallback(
    (title: string) => {
      updateSourceMetaAsync({ name: title });
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
  const isLinked = !!attrs.isLinked;
  const resolvedTitle = attrs.title || source?.name || "";

  const handleTitleChange = (title: string) => {
    if (isLinked) {
      // linked view → independent label, never rename the source
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

  // Mirror this node's views into the source-level catalog (source.savedViews)
  // so any node on this source can open one with its filters/sorts intact.
  // registerViewsAsync no-ops when nothing changed, so this stays cheap.
  useEffect(() => {
    if (!source) return;
    registerViewsAsync(attrs.views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, registerViewsAsync]);

  const [dragX, setDragX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const dbPageId = source?.pageId ?? attrs.pageId ?? null;
  const dbPage =
    dbPageId != null && pages ? (findPage(pages, dbPageId) ?? null) : null;

  const tableRef = useRef<HTMLDivElement>(null);
  const [activeColId, setActiveColId] = useState<string | null>(null);

  // Live resize → local draft only (no network per tick). Disabled when locked.
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

  // Activate the view named in the URL hash (#view=<id>). Views are
  // source-owned and load async, so run once they're available rather than
  // on mount.
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
    // run once, after the source's views have loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.views?.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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

  // ── No source yet  picker ────────────────────────────────────────────────
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
              // If the user picked a saved view, open ONLY that view — its
              // filters, sorts and layout — instead of keeping the node's
              // default starter Table view alongside it.
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
    return (
      <NodeViewWrapper as="div" data-type="database">
        <div className="db-empty-state">Loading…</div>
      </NodeViewWrapper>
    );
  }

  const recordParentId = dbPageId;

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

  // Ellipsis menu — Lock + Copy link (always available; lock itself is not
  // a structural edit, and copy link is read-only).
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

  // ── Shared chrome ───────────────────────────────────────────────────────
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
            {/* Toolbar holds view tabs / add-view / view config — locked when
                the database is locked (structure + view config are frozen). */}
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
          {/* Filter / sort chips are view config → frozen when locked.
              They still RENDER (so a shared viewer sees what's applied) but
              editing is disabled via the locked prop. */}
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

  const groupProp = activeView?.groupByPropertyId
    ? source.properties.find((p) => p.id === activeView.groupByPropertyId)
    : undefined;
  const collapsedGroups = new Set(activeView?.collapsedGroups ?? []);
  const ungrouped = !groupProp;

  // resolvedRecords + sortedRecords are memoized at the top of the component.
  // Only grouping (cheap, and dependent on render-local groupProp) is done here.
  const groups = groupRecords(sortedRecords, groupProp);

  const toggleCollapse = (key: string) => {
    const next = collapsedGroups.has(key)
      ? [...collapsedGroups].filter((k) => k !== key)
      : [...collapsedGroups, key];
    onUpdateView({ collapsedGroups: next });
  };

  const widthFor = (p: DatabaseProperty) => draftWidths[p.id] ?? p.width ?? 160;
  const activeIndex = activeColId
    ? visibleProperties.findIndex((p) => p.id === activeColId)
    : -1;
  const overIndex = overId
    ? visibleProperties.findIndex((p) => p.id === overId)
    : -1;

  const activeWidth =
    activeIndex >= 0 ? widthFor(visibleProperties[activeIndex]) : 0;

  const shiftFor = (i: number): number => {
    if (activeIndex < 0 || overIndex < 0 || i === activeIndex) return 0;
    if (activeIndex < overIndex && i > activeIndex && i <= overIndex) {
      return -activeWidth;
    }
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
      contentEditable={false}
    >
      <div className="db-header-row" style={{ gridTemplateColumns }}>
        <DndContext
          // locked → no sensors → drag never activates (reorder frozen)
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

        {/* Add-property cell — hidden when locked (no schema changes). */}
        <CardItemGroup
          orientation="horizontal"
          className="db-header-cell db-header-cell--actions"
        >
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

      <div className="db-grid" style={{ display: "grid", gridTemplateColumns }}>
        {groups.map((group) => {
          const isCollapsed = !ungrouped && collapsedGroups.has(group.key);
          return (
            <React.Fragment key={group.key}>
              {!ungrouped && (
                <div
                  className="db-group-header"
                  style={{
                    gridColumn: "1 / -1",
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "var(--db-editor-width)",
                    background: "var(--tt-bg-color)",
                    borderBottom: "1px solid var(--tt-border-color)",
                    padding: "4px 6px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleCollapse(group.key)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="tiptap-button-icon" size={14} />
                  ) : (
                    <ChevronDown className="tiptap-button-icon" size={14} />
                  )}
                  <span
                    className="tiptap-button-text"
                    style={{ fontWeight: 500 }}
                  >
                    {group.label}
                  </span>
                  <Badge data-style="gray" size="small">
                    <span>{group.records.length}</span>
                  </Badge>
                </div>
              )}

              {!isCollapsed &&
                group.records.map((record) => (
                  <div
                    key={record.id}
                    className="db-row"
                    style={{ display: "contents" }}
                  >
                    {visibleProperties.map((prop, i) => {
                      const shift = shiftFor(i);
                      return (
                        <div
                          key={`${record.id}:${prop.id}`}
                          data-row-id={record.id}
                          className="db-td"
                          style={{
                            borderRight: "1px solid var(--tt-border-color)",
                            borderBottom: "1px solid var(--tt-border-color)",
                            // display + overflow intentionally come from .db-td
                            // (and the .db-row:has(.db-cell[data-wrap]) wrap
                            // override). Setting them inline blocks the
                            // height/centering/wrap CSS and collapses the rows.
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
                          {/* Cells stay editable when locked — only structure
                              is frozen, not data (Notion behavior). */}
                          <Cell
                            property={prop}
                            value={
                              (record.values[prop.id] ??
                                null) as CellValue | null
                            }
                            record={record}
                            templateId={attrs.templateId}
                            columnValues={sortedRecords.map(
                              (r) => (r.values[prop.id] ?? null) as CellValue,
                            )}
                            onChange={(v) =>
                              setCellValue(record.id, prop.id, v)
                            }
                            unwrapped={db.isUnwrapped(
                              db.activeView.id,
                              prop.id,
                            )}
                            view={db.activeView}
                            properties={source.properties}
                          />
                        </div>
                      );
                    })}
                    <div className="db-header-cell--actions" />
                  </div>
                ))}
            </React.Fragment>
          );
        })}
      </div>

      {/* New record stays available when locked (adding data is allowed).
          Visibility driven by React hover state — no CSS class needed. */}
      <div
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

      <DatabaseCalculations
        properties={visibleProperties}
        records={sortedRecords}
        gridTemplateColumns={gridTemplateColumns}
      />
    </NodeViewWrapper>,
  );
}
