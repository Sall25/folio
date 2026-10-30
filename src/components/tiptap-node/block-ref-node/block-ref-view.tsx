import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  NodeViewWrapper,
  useEditorState,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { MaterialIcon } from "src/components/icons";
import { fetchPageOrShared } from "src/api/pages";
import { queryKeys } from "src/lib/queryKeys";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { setPendingScrollTarget } from "src/features/inbox/inbox-panel/pending-scroll-target";
import { MirrorBody } from "src/features/editor/pins/pin-mirrors";
import { findBlock, findLive } from "src/features/editor/pins/pin-blocks";
import "./block-ref-node.scss";

// How often a live view re-reads its page. Pages save their content a few
// seconds after an edit; nothing pushes it to other pages, so it's read
// again on this beat (and when the window regains focus).
const REFRESH_MS = 30_000;

export function BlockRefView({ editor, node, selected }: ReactNodeViewProps) {
  const { t } = useTranslation();
  const pageId = (node.attrs.pageId as string | null) ?? null;
  const blockId = (node.attrs.blockId as string | null) ?? null;
  const { activePageId, setActivePageId } = useOptionalActivePage();
  const samePage = pageId != null && pageId === activePageId;

  // Same cache entry as usePage(pageId), re-read every REFRESH_MS.
  const { data: page, isLoading } = useQuery({
    queryKey: queryKeys.pages.detail(pageId ?? ""),
    queryFn: () => fetchPageOrShared(pageId!),
    enabled: pageId != null,
    refetchInterval: samePage ? false : REFRESH_MS,
  });

  // On its own page: the block itself, as it changes.
  const live = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      samePage && blockId && e ? findLive(e, blockId) : null,
    equalityFn: (a, b) => a?.node === b?.node && a?.pos === b?.pos,
  });

  const shown = useMemo(() => {
    if (live) return live.node;
    const json = blockId ? findBlock(page?.content, blockId) : null;
    if (!json) return null;
    try {
      return editor.schema.nodeFromJSON(json);
    } catch {
      return null; // a block type this editor doesn't know
    }
  }, [live, page?.content, blockId, editor]);

  const goTo = () => {
    if (!pageId || !blockId) return;
    setPendingScrollTarget({ pageId, targetNodeId: blockId });
    if (!samePage) setActivePageId(pageId);
    else
      document
        .querySelector(`[data-id="${blockId}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <NodeViewWrapper
      className="block-ref"
      data-selected={selected || undefined}
      contentEditable={false}
    >
      <div className="block-ref__head">
        <MaterialIcon name="sync_alt" size={14} />
        <span>{t("pins.live.from")}</span>
        {page ? (
          <button type="button" className="block-ref__source" onClick={goTo}>
            {page.title || t("page.untitled")}
          </button>
        ) : null}
      </div>
      <div className="block-ref__body">
        {shown ? (
          <MirrorBody
            editor={editor}
            node={shown}
            pos={live?.pos ?? 0}
            readOnly={!live}
          />
        ) : isLoading ? (
          <div className="block-ref__loading" />
        ) : (
          <div className="pin-mine__missing">
            <MaterialIcon name={page ? "link_off" : "lock"} size={16} />
            {page ? t("pins.removed") : t("pins.noAccess")}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
