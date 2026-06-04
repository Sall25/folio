import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { BoardCard } from "../primitives/board-card";
import type {
  DatabaseAttrs,
  DatabaseView,
  DataSource,
  GalleryView,
} from "../types/types";
import "./database-gallery-node-view.scss";

// Cards per row by size. Larger size = fewer, wider cards.
const CARD_COLUMNS = {
  small: 5,
  medium: 4,
  large: 3,
} as const;

export function DatabaseGalleryNodeView({
  attrs,
  source,
  view,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
  view: DatabaseView;
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
  const cardCols = CARD_COLUMNS[cardSize];

  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const cardProps = source.properties.filter((p) => !hidden.has(p.id));

  return (
    <div
      className="db-gallery"
      data-type="database-gallery"
      style={
        {
          "--db-gallery-cols": cardCols,
          "--db-gallery-cover-fit": coverFit,
        } as React.CSSProperties
      }
    >
      <div className="db-gallery__body">
        {source.records.map((rec) => (
          <div key={rec.id} className="db-gallery__card">
            <BoardCard
              record={rec}
              properties={cardProps}
              cardPreview="cover"
              sourceId={attrs.sourceId!}
              onChange={(propId, v) => setCellValue(rec.id, propId, v)}
              view={view}
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
