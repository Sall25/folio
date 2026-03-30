import { useState, useCallback, useEffect, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { canCopyAnchorLink, copyAnchorLink } from "./utils";

interface UseCopyAnchorLinkOptions {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  onCopied?: () => void;
  onNodeIdNotFound?: (found: boolean) => void;
  onExtractedNodeId?: (id: string | null) => void;
}

export function useCopyAnchorLink({
  editor,
  hideWhenUnavailable = false,
  onCopied,
  onNodeIdNotFound,
  onExtractedNodeId,
}: UseCopyAnchorLinkOptions) {
  const [copied, setCopied] = useState(false);

  const onCopiedRef = useRef(onCopied);
  const onNodeIdNotFoundRef = useRef(onNodeIdNotFound);
  const onExtractedNodeIdRef = useRef(onExtractedNodeId);

  useEffect(() => {
    onCopiedRef.current = onCopied;
  }, [onCopied]);
  useEffect(() => {
    onNodeIdNotFoundRef.current = onNodeIdNotFound;
  }, [onNodeIdNotFound]);
  useEffect(() => {
    onExtractedNodeIdRef.current = onExtractedNodeId;
  }, [onExtractedNodeId]);

  const canCopy = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? canCopyAnchorLink(e) : false),
  });

  const isVisible = hideWhenUnavailable ? canCopy : true;

  const handleCopy = useCallback(async () => {
    if (!editor) return false;
    const success = await copyAnchorLink(editor, {
      onCopied: onCopiedRef.current,
      onNodeIdNotFound: onNodeIdNotFoundRef.current,
      onExtractedNodeId: onExtractedNodeIdRef.current,
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    return success;
  }, [editor]); // callbacks removed from deps

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "l") {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleCopy]); // now only re-runs if editor changes

  return { isVisible, canCopy, copied, handleCopy };
}
