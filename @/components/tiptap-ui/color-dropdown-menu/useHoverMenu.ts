import { useState, useRef, useCallback } from "react";

export function useHoverMenu(delay = 100) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  }, []);

  const closeImmediately = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      // Check if we're still moving within the same group
      const related = e.relatedTarget as Node | null;
      if (containerRef.current?.contains(related)) return;

      timerRef.current = setTimeout(() => {
        setOpen(false);
      }, delay);
    },
    [delay],
  );

  return {
    open,
    setOpen,
    containerRef,
    handleMouseEnter,
    handleMouseLeave,
    closeImmediately,
  };
}
