import { useRef, useCallback, useEffect } from "react";

export function useAutosize({
  minRows,
  maxRows,
  value,
  externalRef,
}: {
  minRows: number;
  maxRows: number;
  value: string;
  externalRef?: React.ForwardedRef<HTMLTextAreaElement>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shadowRef = useRef<HTMLTextAreaElement>(null);
  const externalRefCopy = useRef(externalRef); // local copy — safe to read .current

  const sync = useCallback(() => {
    const textarea = textareaRef.current;
    const shadow = shadowRef.current;
    if (!textarea || !shadow) return;

    const style = window.getComputedStyle(textarea);

    shadow.style.width = style.width;
    shadow.style.font = style.font;
    shadow.style.fontSize = style.fontSize;
    shadow.style.fontFamily = style.fontFamily;
    shadow.style.fontWeight = style.fontWeight;
    shadow.style.lineHeight = style.lineHeight;
    shadow.style.letterSpacing = style.letterSpacing;
    shadow.style.padding = style.padding;
    shadow.style.borderWidth = style.borderWidth;
    shadow.style.boxSizing = style.boxSizing;
    shadow.style.whiteSpace = style.whiteSpace;
    shadow.style.wordBreak = style.wordBreak;

    // Force single row to get baseline height
    shadow.rows = 1;
    shadow.value = "x";
    const oneRowHeight = shadow.scrollHeight;

    // Now measure actual content
    shadow.rows = maxRows === Infinity ? 1 : maxRows;
    shadow.value = textarea.value || textarea.placeholder || "x";
    const contentHeight = shadow.scrollHeight;

    const minHeight = oneRowHeight * minRows;
    const maxHeight = maxRows === Infinity ? Infinity : oneRowHeight * maxRows;

    const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [minRows, maxRows]);

  useEffect(() => {
    sync();
  }, [value, sync]);

  const mergedTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      (textareaRef as React.RefObject<HTMLTextAreaElement | null>).current =
        node;

      const ext = externalRefCopy.current;
      if (typeof ext === "function") {
        ext(node);
      } else if (ext) {
        ext.current = node; // ext is a local ref copy, not a prop — safe to mutate
      }
    },
    [], // externalRefCopy.current is read at call time, no dep needed
  );

  return { textareaRef: mergedTextareaRef, shadowRef, sync };
}
