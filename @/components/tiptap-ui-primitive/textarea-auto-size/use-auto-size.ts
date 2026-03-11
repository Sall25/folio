import { useCallback, useEffect, useRef } from "react"

export function useAutosize({ minRows = 1, maxRows = Infinity, value }: {
  minRows?: number
  maxRows?: number
  value: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const shadowRef = useRef<HTMLTextAreaElement | null>(null)

  const sync = useCallback(() => {
    const el = textareaRef.current
    const shadow = shadowRef.current
    if (!el || !shadow) return

    // Copy computed styles to shadow element
    const style = window.getComputedStyle(el);
    shadow.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      height: 0;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
      font: ${style.font};
      padding: ${style.padding};
      border: ${style.border};
      box-sizing: ${style.boxSizing};
      width: ${el.offsetWidth}px;
    `;

    shadow.value = el.value || el.placeholder || ' '

    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const extraHeight = paddingTop + paddingBottom + borderTop + borderBottom;

    const minHeight = lineHeight * minRows + extraHeight;
    const maxHeight =
      maxRows === Infinity ? Infinity : lineHeight * maxRows + extraHeight;

    shadow.style.height = "auto";
    const scrollHeight = shadow.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    el.style.height = `${newHeight}px`;
    el.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";

  }, [minRows, maxRows])

  useEffect(() => {
    sync()
  }, [value, sync])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sync])

  return { textareaRef, shadowRef, sync }
}