import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import type { DatabaseAttrs, GalleryView } from "../types/types";
import "./database-gallery-node-view.scss";

const CARD_SIZES = {
  small: 160,
  medium: 220,
  large: 280,
} as const;

export function DatabaseGalleryNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const activeView = db.activeView as GalleryView | undefined;
  const cardSize = activeView?.cardSize ?? "medium";
  const coverFit = activeView?.coverFit ?? "cover";
  const coverPropertyId = activeView?.coverPropertyId ?? "";

  const cardWidth = CARD_SIZES[cardSize];

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
            onUpdateAttributes={(a) => updateAttributes(a)}
          />

          <div
            className="db-gallery"
            data-type="database-gallery"
            style={
              {
                "--db-gallery-card-width": `${cardWidth}px`,
                "--db-gallery-cover-fit": coverFit,
                "--db-gallery-cover-prop": JSON.stringify(coverPropertyId),
              } as React.CSSProperties
            }
          >
            <NodeViewContent as="div" className="db-gallery__body" />
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
