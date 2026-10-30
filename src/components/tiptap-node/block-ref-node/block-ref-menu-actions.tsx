import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createIcon } from "src/components/icons";
import { MenuRow } from "src/features/database/components/menu-row";
import { getSelectedBlocks } from "src/lib/block-selection";
import { queryKeys } from "src/lib/queryKeys";
import type { Page } from "src/types";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import {
  asCopy,
  findBlock,
  findLive,
} from "src/features/editor/pins/pin-blocks";

// The block menu's "Turn into copy" row, for a live view (blockRef): puts the
// block itself in its place, no longer linked to the original.

const CopyIcon = createIcon("BlockRefCopy", "content_copy");

function liveViewTarget(editor: Editor) {
  const sel = editor.state.selection;
  const blocks = getSelectedBlocks(sel);
  const target =
    blocks?.length === 1
      ? blocks[0]
      : sel instanceof NodeSelection
        ? { node: sel.node, pos: sel.from }
        : null;
  return target?.node.type.name === "blockRef" ? target : null;
}

export function BlockRefMenuActions({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { activePageId } = useOptionalActivePage();
  const target = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? liveViewTarget(e) : null),
    equalityFn: (a, b) => a?.node === b?.node && a?.pos === b?.pos,
  });
  if (!target || !editor.isEditable) return null;

  const { node, pos } = target;
  const pageId = node.attrs.pageId as string | null;
  const blockId = node.attrs.blockId as string | null;
  // The block as the live view shows it: from this page, or the saved page.
  const source =
    pageId && blockId
      ? pageId === activePageId
        ? (findLive(editor, blockId)?.node.toJSON() ?? null)
        : findBlock(
            qc.getQueryData<Page | null>(queryKeys.pages.detail(pageId))
              ?.content,
            blockId,
          )
      : null;

  return (
    <MenuRow
      Icon={CopyIcon}
      label={t("pins.live.toCopy")}
      disabled={!source}
      onClick={() => {
        if (!source) return;
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: pos, to: pos + node.nodeSize },
            asCopy(source),
          )
          .run();
        onAction?.();
      }}
    />
  );
}
