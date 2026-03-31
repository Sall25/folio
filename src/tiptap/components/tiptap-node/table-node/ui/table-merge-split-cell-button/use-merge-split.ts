import { useEditorState } from "@tiptap/react";
import { useTableOverlays } from "../table-overlays/use-table-overlays";

export function useMergeCells() {
  const { editor } = useTableOverlays();

  const { canMerge, canSplit } = useEditorState({
    editor: editor!,
    selector: (ctx) => ({
      canMerge: ctx.editor.can().mergeCells(),
      canSplit: ctx.editor.can().splitCell(),
    }),
  });

  const merge = () => editor?.commands.mergeCells();
  const split = () => editor?.commands.splitCell();

  return { canMerge, canSplit, merge, split };
}
