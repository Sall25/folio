import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import type { DatabaseAttrs, GalleryView } from "../types/types";
import { useParentDatabase } from "../hooks/use-parent-database";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";
import { BoardCardCover } from "../primitives/board-card-cover";
import { useMemo } from "react";
import "./database-record-gallery-view.scss";

export function DatabaseRecordGalleryView(props: NodeViewProps) {
  const { node, getPos, editor } = props;

  const { pages } = usePages();
  // Find the linked page for cover — title cell holds pageId
  const pageId = useMemo(() => {
    let id: number | null = null;
    node.forEach((cell) => {
      if (cell.type.name === "titleCell") id = cell.attrs.pageId;
    });
    return id;
  }, [node]);

  const linkedPage = useMemo(() => {
    if (!pageId || !pages) return null;
    return findPage(pages, pageId) ?? null;
  }, [pageId, pages]);

  const db = useParentDatabase(editor, getPos);

  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const activeView = attrs.views.find((v) => v.id === attrs.activeViewId) as
    | GalleryView
    | undefined;

  // const coverFit = activeView?.coverFit ?? "cover";
  // const coverPropertyId = activeView?.coverPropertyId ?? "";

  // Visible properties — exclude title, exclude hidden
  const hiddenPropertyIds = new Set(activeView?.hiddenProperties ?? []);
  const visibleProperties = attrs.properties.filter(
    (p) => p.config.type !== "title" && !hiddenPropertyIds.has(p.id),
  );

  return (
    <NodeViewWrapper
      as="div"
      className="db-gallery-card"
      style={
        {
          "--db-gallery-card-props": JSON.stringify(
            visibleProperties.map((p) => p.id),
          ),
        } as React.CSSProperties
      }
    >
      {/* Cover — from linked page cover */}
      <BoardCardCover
        page={linkedPage}
        recordId={node.attrs.id ?? ""}
        height={
          activeView?.cardSize === "small"
            ? 80
            : activeView?.cardSize === "large"
              ? 160
              : 120
        }
      />
      {/* Cells — title first, then visible properties */}
      <div className="db-gallery-card__body">
        <NodeViewContent as="div" className="db-gallery-card__cells" />
      </div>
    </NodeViewWrapper>
  );
}
