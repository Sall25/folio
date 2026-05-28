import type { NodeViewProps } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  useCurrentEditor,
} from "@tiptap/react";
import type { DatabaseAttrs, PropertyConfig } from "../types/types";
import {
  Card,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { PropertyHeader } from "../components/property-header";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Ellipsis, Plus } from "lucide-react";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { useRef, useEffect, useState } from "react";
import "./database-table-node-view.scss";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { PROPERTY_TYPE_ICONS } from "../types/property-type-meta";
import { DatabaseProvider } from "./database-provider";
import { ResizableNodeProvider } from "../../figure-node";
import { DatabaseListNodeView } from "./database-list-node-view";
import { DatabaseBoardNodeView } from "./database-board-node-view";
import { DatabaseGalleryNodeView } from "./database-gallery-node-view";
import { DatabaseCalendarNodeView } from "./database-calendar-node-view";
import { DatabaseTimelineNodeView } from "./database-timeline-node-view";
import { FilterRuleChips } from "../components/filter-rule-chips";
import { DatabaseTitleBar } from "../components/database-title-bar";
import { DatabaseCalculations } from "../components/database-calculations";
import type { Node } from "@tiptap/pm/model";
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

export function DatabaseNodeView(props: NodeViewProps) {
  const { node, editor, updateAttributes } = props;
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const { editor: mainEditor } = useCurrentEditor();

  const [, setRenderKey] = useState(0);
  useEffect(() => {
    if (!mainEditor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = ({ transaction }: { transaction: any }) => {
      if (transaction.getMeta("peekPageClosed")) {
        setRenderKey((k) => k + 1);
      }
    };
    mainEditor.on("transaction", handler);
    return () => {
      mainEditor.off("transaction", handler);
    };
  }, [mainEditor]);

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { propId, width } = (e as CustomEvent).detail;
      updateAttributes({
        ...attrs,
        properties: attrs.properties.map((p) =>
          p.id === propId ? { ...p, width } : p,
        ),
      });
    };
    el.addEventListener("column:resize", handler);
    return () => el.removeEventListener("column:resize", handler);
  }, [attrs, updateAttributes]);

  if (db.activeView.type === "gallery")
    return <DatabaseGalleryNodeView {...props} />;
  if (db.activeView?.type === "board")
    return <DatabaseBoardNodeView {...props} />;
  if (db.activeView?.type === "list")
    return <DatabaseListNodeView {...props} />;
  if (db.activeView?.type === "calendar")
    return <DatabaseCalendarNodeView {...props} />;
  if (db.activeView?.type === "timeline")
    return <DatabaseTimelineNodeView {...props} />;

  // Visible properties (excluding hidden ones from active view)
  const hiddenProperties = new Set(db.activeView?.hiddenProperties ?? []);
  const visibleProperties = attrs.properties.filter(
    (p) => !hiddenProperties.has(p.id),
  );

  // Grid: visible property columns + trailing 1fr for the actions column
  const gridTemplateColumns =
    visibleProperties.map((p) => `${p.width ?? 160}px`).join(" ") + " 1fr";

  const records: Node[] = [];
  node.forEach((child) => {
    if (child.type.name === "databaseRecord") records.push(child);
  });

  return (
    <NodeViewWrapper>
      <DatabaseProvider
        attrs={attrs}
        db={db}
        editor={editor}
        updateAttributes={updateAttributes}
      >
        <CardItemGroup>
          <div style={{ maxWidth: "var(--db-editor-width)", paddingRight: 20 }}>
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(attrs) => updateAttributes(attrs)}
            />
          </div>
          <DatabaseTitleBar
            title={attrs.title}
            onTitleChange={(title) => updateAttributes({ ...attrs, title })}
            onHideTitleChange={(hide) =>
              updateAttributes({ ...attrs, hideTitle: hide })
            }
          />
          <FilterRuleChips attrs={attrs} db={db} activeView={db.activeView} />
          <div ref={tableRef} className="db-table" data-type="database-table">
            <div className="db-header-row" style={{ gridTemplateColumns }}>
              {visibleProperties.map((prop) => (
                <ResizableNodeProvider
                  key={prop.id}
                  onResizeEnd={({ width }, ref) => {
                    const propId = (ref?.current as HTMLElement)?.dataset
                      .propId;
                    if (!propId) return;
                    updateAttributes({
                      ...attrs,
                      properties: attrs.properties.map((p) =>
                        p.id === propId ? { ...p, width } : p,
                      ),
                    });
                  }}
                >
                  <PropertyHeader prop={prop} />
                </ResizableNodeProvider>
              ))}
              <div className="db-header-cell db-header-cell--actions">
                <CardItemGroup orientation="horizontal">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost">
                        <Plus className="tiptap-button-icon" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Card
                        style={{
                          maxHeight: 300,
                          overflow: "scroll",
                          minWidth: 300,
                        }}
                      >
                        <CardHeader>
                          <CardGroupLabel>Properties</CardGroupLabel>
                        </CardHeader>
                        <CardItemGroup
                          style={{ width: "100%", padding: "0 5px" }}
                        >
                          {allPropertyTypes.map((prop) => {
                            const Icon = PROPERTY_TYPE_ICONS[prop];
                            return (
                              <Button
                                key={prop}
                                variant="ghost"
                                style={{
                                  borderRadius: "var(--tt-radius-sm)",
                                  width: "100%",
                                  justifyContent: "flex-start",
                                }}
                                onClick={() => db.addProperty(prop)}
                              >
                                <Icon className="tiptap-button-icon" />
                                <span className="tiptap-button-text">
                                  {prop}
                                </span>
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
            </div>

            <NodeViewContent
              as="div"
              className="db-body"
              style={
                {
                  "--db-grid-columns": gridTemplateColumns,
                } as React.CSSProperties
              }
            />
            <Button
              variant="ghost"
              style={{
                justifyContent: "flex-start",
                borderRadius: "var(--tt-radius-sm)",
                marginTop: "10px !important",
                fontSize: 12,
              }}
              onClick={() => editor.commands.addDatabaseRecord(node.attrs.id)}
            >
              <Plus className="tiptap-button-icon" />
              <span className="tiptap-button-text">New</span>
            </Button>
            <DatabaseCalculations
              attrs={attrs}
              records={records}
              visibleProperties={visibleProperties}
              gridTemplateColumns={gridTemplateColumns}
            />
          </div>
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );
}
