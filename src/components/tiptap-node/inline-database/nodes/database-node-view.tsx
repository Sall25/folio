import type { JSONContent, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useRef, useEffect } from "react";
import { Ellipsis, Plus } from "lucide-react";
import {
  Card,
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
  PropertyConfig,
  CellValue,
} from "../types/types";
import "./database-table-node-view.scss";
import { useDebouncedCallback } from "use-debounce";

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

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableRef.current;
    if (!el || !source) return;
    const handler = (e: Event) => {
      const { propId, width } = (e as CustomEvent).detail;
      updatePropertiesAsync(
        source.properties.map((p) => (p.id === propId ? { ...p, width } : p)),
      );
    };
    el.addEventListener("column:resize", handler);
    return () => el.removeEventListener("column:resize", handler);
  }, [source, updatePropertiesAsync]);

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

  // The database's own page (cover/icon). Prefer source.pageId; fall back to node.
  const dbPageId = source.pageId ?? attrs.pageId ?? null;
  const dbPage =
    dbPageId != null && pages ? (findPage(pages, dbPageId) ?? null) : null;

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
    return chrome(<DatabaseBoardNodeView attrs={attrs} source={source} />);
  if (activeView?.type === "gallery")
    return chrome(<DatabaseGalleryNodeView attrs={attrs} source={source} />);
  if (activeView?.type === "list")
    return chrome(
      <DatabaseListNodeView
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
  const gridTemplateColumns =
    visibleProperties.map((p) => `${p.width ?? 160}px`).join(" ") + " 1fr";

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

  return chrome(
    <NodeViewWrapper
      as={"div"}
      ref={tableRef}
      className="db-table"
      data-type="database-table"
    >
      <div className="db-header-row" style={{ gridTemplateColumns }}>
        {visibleProperties.map((prop) => (
          <ResizableNodeProvider
            key={prop.id}
            onResizeEnd={({ width }, ref) => {
              const propId = (ref?.current as HTMLElement)?.dataset.propId;
              if (!propId) return;
              updatePropertiesAsync(
                source.properties.map((p) =>
                  p.id === propId ? { ...p, width } : p,
                ),
              );
            }}
          >
            <PropertyHeader prop={prop} />
          </ResizableNodeProvider>
        ))}
        <CardItemGroup
          orientation="horizontal"
          className="db-header-cell db-header-cell--actions"
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost">
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
                <CardItemGroup style={{ width: "100%", padding: "0 5px" }}>
                  {allPropertyTypes.map((t) => {
                    const Icon = PROPERTY_TYPE_ICONS[t];
                    return (
                      <Button
                        key={t}
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
                    );
                  })}
                </CardItemGroup>
              </Card>
            </PopoverContent>
          </Popover>
          <Button variant="ghost">
            <Ellipsis className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
      </div>

      <div className="db-body">
        {source.records.map((record) => (
          <div
            key={record.id}
            className="db-row"
            style={{ display: "grid", gridTemplateColumns }}
          >
            {visibleProperties.map((prop) => (
              <Cell
                key={prop.id}
                property={prop}
                value={(record.values[prop.id] ?? null) as CellValue | null}
                record={record}
                templateId={attrs.templateId}
                columnValues={source.records.map(
                  (r) => (r.values[prop.id] ?? null) as CellValue,
                )}
                onChange={(v) => setCellValue(record.id, prop.id, v)}
              />
            ))}
            <div className="db-cell db-cell--actions" />
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
