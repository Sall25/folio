import { useState, useRef, useCallback, useEffect } from "react";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import CoverControlsGroup from "./cover-controls";
import type { Page } from "src/components/tiptap-templates/simple/types";

export default function GradientCover({
  gradient,
  onRemoveCoverAsync,
  page,
}: {
  page: Page;
  gradient: string;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onPopoverOpenChange = useCallback(
    (open: boolean) => setPopoverOpen(open),
    [],
  );

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setBtnPosition({
        top: 60,
        right: window.innerWidth - rect.right + 24,
      });
    }
  }, []);
  const { activePage } = useActivePage();

  const showControls = hovering || popoverOpen;

  if (!activePage) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 200,
        background: gradient,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {showControls && (
        <CoverControlsGroup
          page={page}
          btnPosition={btnPosition}
          onRemoveCoverAsync={onRemoveCoverAsync}
          popoverOpen={popoverOpen}
          onPopoverOpenChange={onPopoverOpenChange}
        />
      )}
    </div>
  );
}
