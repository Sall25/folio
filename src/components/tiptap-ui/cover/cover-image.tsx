/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef } from "react";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import type { Page } from "src/components/tiptap-templates/simple/types";
import CoverControlsGroup from "./cover-controls";

// ============================================================
// CoverImage
// ============================================================

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

  // Always derive from props, local state only overrides during active editing
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
    setLocalPositionY(null); // clear override after save
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
    >
      <style>{`
        .cover-image-root {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }
        .cover-image-root img {
          width: 100%;
          height: 200%;
          object-fit: cover;
          display: block;
          position: absolute;
          left: 0;
        }
      `}</style>

      <img
        src={coverImage ?? ""}
        alt="cover"
        draggable={false}
        style={{ top: `${-(positionY / 100) * 50}%` }}
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
