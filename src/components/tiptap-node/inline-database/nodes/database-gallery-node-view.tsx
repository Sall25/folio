import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { BoardCard } from "../primitives/board-card";
import type { DatabaseAttrs, DataSource, GalleryView } from "../types/types";
import "./database-gallery-node-view.scss";

const CARD_SIZES = {
  small: 230,
  medium: 280,
  large: 320,
} as const;

export function DatabaseGalleryNodeView({
  attrs,
  source,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
}) {
  const { addPageAsync } = usePages();
  const { addRecordWithPageAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );
  const recordParentId = source.pageId ?? null;

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as GalleryView | undefined;

  const cardSize = activeView?.cardSize ?? "medium";
  const coverFit = activeView?.coverFit ?? "cover";
  const cardWidth = CARD_SIZES[cardSize];

  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const cardProps = source.properties.filter((p) => !hidden.has(p.id));

  return (
    <div
      className="db-gallery"
      data-type="database-gallery"
      style={
        {
          "--db-gallery-card-width": `${cardWidth}px`,
          "--db-gallery-cover-fit": coverFit,
        } as React.CSSProperties
      }
    >
      <div className="db-gallery__body">
        {source.records.map((rec) => (
          <div
            key={rec.id}
            className="db-gallery__card"
            style={{ width: cardWidth }}
          >
            <BoardCard
              record={rec}
              properties={cardProps}
              cardPreview="cover"
              sourceId={attrs.sourceId!}
              onChange={(propId, v) => setCellValue(rec.id, propId, v)}
            />
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        style={{
          justifyContent: "flex-start",
          borderRadius: "var(--tt-radius-sm)",
        }}
        onClick={() =>
          addRecordWithPageAsync({
            title: "",
            parentPageId: recordParentId,
            createPage: addPageAsync,
          })
        }
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New</span>
      </Button>
    </div>
  );
}
