import type { NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
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
import { useRef, useEffect } from "react";
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

  // ── Board view ───────────────────────────────────────────────────────────
  if (db.activeView.type === "gallery") {
    return <DatabaseGalleryNodeView {...props} />;
  }

  // ── Board view ───────────────────────────────────────────────────────────
  if (db.activeView?.type === "board") {
    return <DatabaseBoardNodeView {...props} />;
  }

  // ── List view ──────────────────────────────────────────────────────────
  if (db.activeView?.type === "list") {
    return <DatabaseListNodeView {...props} />;
  }

  // ── Calendar view ──────────────────────────────────────────────────────────
  if (db.activeView?.type === "calendar") {
    return <DatabaseCalendarNodeView {...props} />;
  }

  // ── Timeline view ──────────────────────────────────────────────────────────
  if (db.activeView?.type === "timeline") {
    return <DatabaseTimelineNodeView {...props} />;
  }

  // ── Table view (default) ───────────────────────────────────────────────
  const gridTemplateColumns = attrs.properties
    .map((p) => `${p.width ?? 160}px`)
    .join(" ");

  return (
    <NodeViewWrapper>
      <DatabaseProvider
        attrs={attrs}
        db={db}
        editor={editor}
        updateAttributes={updateAttributes}
      >
        <CardItemGroup>
          <DatabaseToolbar
            attrs={attrs}
            db={db}
            onUpdateAttributes={(attrs) => updateAttributes(attrs)}
          />
          <div ref={tableRef} className="db-table" data-type="database-table">
            <div
              className="db-header-row"
              style={{ gridTemplateColumns: `${gridTemplateColumns} 1fr` }}
            >
              {attrs.properties.map((prop) => (
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
          </div>

          <Button
            variant="ghost"
            style={{
              justifyContent: "flex-start",
              borderRadius: "var(--tt-radius-sm)",
            }}
            onClick={() => editor.commands.addDatabaseRecord(node.attrs.id)}
          >
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">New</span>
          </Button>
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );
}
