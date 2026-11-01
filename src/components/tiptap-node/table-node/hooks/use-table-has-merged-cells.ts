import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { tableContextPluginKey } from "../extensions/table-context";
import { hasMergedCells } from "../extensions/utils";

/** Whether the hovered table has merged cells: Move, Sort and Duplicate
 *  hide then (they'd tear the table apart; the commands refuse too). */
export function useTableHasMergedCells(editor: Editor | null): boolean {
  return (
    useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx.editor) return false;
        const tablePos = tableContextPluginKey.getState(ctx.editor.state)?.tablePos;
        if (tablePos == null) return false;
        const table = ctx.editor.state.doc.nodeAt(tablePos);
        return !!table && table.type.spec.tableRole === "table" && hasMergedCells(table);
      },
    }) ?? false
  );
}
