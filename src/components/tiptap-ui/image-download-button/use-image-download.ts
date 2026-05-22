import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

interface UseImageDownloadProps {
  editor?: Editor | null;
  onDownloaded?: () => void;
}

interface UseImageDownloadReturn {
  isVisible: boolean;
  canDownload: boolean;
  handleImageDownload: () => boolean;
}

export function useImageDownload({
  editor,
  onDownloaded,
}: UseImageDownloadProps): UseImageDownloadReturn {
  const { selection } = editor?.state ?? {};
  const imageNode =
    selection instanceof NodeSelection && selection.node.type.name === "image"
      ? selection.node
      : null;

  const isVisible = !!imageNode;
  const canDownload = !!imageNode?.attrs?.src;

  const handleImageDownload = useCallback((): boolean => {
    if (!editor) return false;
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection)) return false;
    const node = selection.node;
    if (node.type.name !== "image" || !node.attrs?.src) return false;

    const a = document.createElement("a");
    a.href = node.attrs.src;
    a.download = node.attrs.alt || "image";
    a.target = "_blank";
    a.click();

    onDownloaded?.();
    return true;
  }, [editor, onDownloaded]);

  useHotkeys(
    "alt+shift+d",
    (e) => {
      e.preventDefault();
      handleImageDownload();
    },
    { enableOnContentEditable: true },
  );

  return { isVisible, canDownload, handleImageDownload };
}
