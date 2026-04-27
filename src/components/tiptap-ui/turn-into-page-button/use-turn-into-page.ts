import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { FileIcon } from "lucide-react";

interface Props {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  onTurnedIntoPage?: () => void;
}

function canTurnIntoPage(editor: Editor | null): boolean {
  if (!editor) return false;
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return false;
  return selection.node.type.name === "pageLink";
}

function turnIntoPage(editor: Editor): boolean {
  const { selection, schema } = editor.state;
  if (!(selection instanceof NodeSelection)) return false;
  if (selection.node.type.name !== "pageLink") return false;

  const paragraphType = schema.nodes.paragraph;
  if (!paragraphType) return false;

  return editor
    .chain()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        const paragraph = paragraphType.create();
        tr.replaceWith(selection.from, selection.to, paragraph);
      }
      return true;
    })
    .run();
}

export function useTurnIntoPage({
  editor,
  hideWhenUnavailable = false,
  onTurnedIntoPage,
}: Props) {
  const [canTurn, setCanTurn] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => setCanTurn(canTurnIntoPage(editor));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const handleTurnIntoPage = useCallback(() => {
    if (!editor) return false;
    const success = turnIntoPage(editor);
    if (success && onTurnedIntoPage) onTurnedIntoPage();
    return success;
  }, [editor, onTurnedIntoPage]);

  const isVisible = hideWhenUnavailable ? canTurn : true;

  return {
    isVisible,
    canTurn,
    handleTurnIntoPage,
    label: "Turn into paragraph",
    Icon: FileIcon,
  };
}
