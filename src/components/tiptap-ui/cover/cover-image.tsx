/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef } from "react";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import type { Page } from "src/components/tiptap-templates/simple/types";
import CoverControlsGroup from "./cover-controls";

export default function CoverImage({
  page,
  onRemoveCoverAsync,
}: {
  page: Page;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const { updatePageAsync } = useActivePage();
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingCoverImage, setPendingCoverImage] = useState<string | null>(
    null,
  );
  const [localPositionY, setLocalPositionY] = useState<number | null>(null);

  const coverImage = pendingCoverImage ?? page.cover.coverImage;
  const positionY = localPositionY ?? (page.cover as any)?.positionY ?? 50;

  const onCoverImageChange = useCallback((url: string) => {
    setPendingCoverImage(url);
  }, []);

  const handlePositionChange = useCallback((y: number) => {
    setLocalPositionY(y);
  }, []);

  const handlePositionDragEnd = useCallback(async () => {
    const y = localPositionY ?? (page.cover as any)?.positionY ?? 50;
    await updatePageAsync({
      ...page,
      cover: { ...page.cover, positionY: y },
    });
    setLocalPositionY(null);
  }, [updatePageAsync, page, localPositionY]);

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

  const showControls = hovering || popoverOpen;

  return (
    <div
      className="cover-image-root"
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: "relative",
        width: "100%",
        height: 260,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={coverImage ?? ""}
        alt="cover"
        draggable={false}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `center ${positionY}%`,
          display: "block",
          userSelect: "none",
        }}
      />

      {showControls && (
        <CoverControlsGroup
          page={page}
          btnPosition={btnPosition}
          onRemoveCoverAsync={onRemoveCoverAsync}
          handlePositionChange={handlePositionChange}
          handlePositionDragEndAsync={handlePositionDragEnd}
          onCoverImageChange={onCoverImageChange}
          popoverOpen={popoverOpen}
          onPopoverOpenChange={onPopoverOpenChange}
        />
      )}
    </div>
  );
}
