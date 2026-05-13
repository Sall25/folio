import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import type { DatabaseAttrs, ListView } from "../types/types";

import "./database-list-node-view.scss";

export function DatabaseListNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const activeView = db.activeView as ListView | undefined;
  const visiblePropertyIds = new Set(activeView?.visibleProperties ?? []);

  // Properties shown inline — exclude title (always first), exclude hidden
  const inlineProperties = attrs.properties.filter(
    (p) =>
      p.config.type !== "title" &&
      (visiblePropertyIds.size === 0 || visiblePropertyIds.has(p.id)),
  );

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

          {/* Pass visible property ids down via CSS custom property so
              each record node view can read it without prop drilling */}
          <div
            className="db-list"
            data-type="database-list"
            style={
              {
                "--db-list-inline-props": JSON.stringify(
                  inlineProperties.map((p) => p.id),
                ),
              } as React.CSSProperties
            }
          >
            <NodeViewContent as="div" className="db-list__body" />
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
