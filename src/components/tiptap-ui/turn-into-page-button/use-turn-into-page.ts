import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { FileIcon } from "lucide-react";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { makePage } from "src/utils/make-page";

interface Props {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  onTurnedIntoPage?: () => void;
}

function canTurnIntoPage(editor: Editor | null): boolean {
  if (!editor) return false;
  const { selection, schema } = editor.state;
  if (!schema.nodes.pageLink) return false;

  if (selection instanceof NodeSelection) {
    return selection.node.type.name === "paragraph";
  }
  if (selection instanceof TextSelection) {
    return selection.$from.parent.type.name === "paragraph";
  }
  return false;
}

export function useTurnIntoPage({
  editor,
  hideWhenUnavailable = false,
  onTurnedIntoPage,
}: Props) {
  const [canTurn, setCanTurn] = useState(false);
  const createPage = useCreatePage();
  const { activePageId } = useActivePage();

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

  const handleTurnIntoPage = useCallback(async () => {
    if (!editor || !canTurn || activePageId === undefined) return false;

    const { selection } = editor.state;

    // Extract text from the paragraph to use as the page title
    let paragraphText = "";
    let from: number;
    let to: number;

    if (
      selection instanceof NodeSelection &&
      selection.node.type.name === "paragraph"
    ) {
      paragraphText = selection.node.textContent;
      from = selection.from;
      to = selection.to;
    } else if (selection instanceof TextSelection) {
      const { $from } = selection;
      from = $from.before($from.depth);
      to = $from.after($from.depth);
      paragraphText = $from.parent.textContent;
    } else {
      return false;
    }

    const title = paragraphText.trim() || "New Page";
    const newPage = makePage({ title, parentId: activePageId });
    await createPage.mutateAsync(newPage);

    // Update pageLink storage so the node view can resolve the page
    editor.storage.pageLink.pages.push(newPage);

    // Replace the paragraph with a pageLink node
    editor
      .chain()
      .command(({ tr, dispatch }) => {
        if (!dispatch) return true;
        const pageLinkType = editor.schema.nodes.pageLink;
        const node = pageLinkType.create({
          pageId: newPage.id,
          parentId: activePageId,
          title: newPage.title,
        });
        tr.replaceWith(from, to, node);
        return true;
      })
      .run();

    onTurnedIntoPage?.();
    return true;
  }, [editor, canTurn, activePageId, createPage, onTurnedIntoPage]);

  return {
    isVisible: hideWhenUnavailable ? canTurn : true,
    canTurn,
    handleTurnIntoPage,
    label: "Turn into page",
    Icon: FileIcon,
  };
}
