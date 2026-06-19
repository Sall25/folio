import { useState, useCallback, useEffect, useRef } from "react";
import type { Page } from "src/types";
import CoverControlsGroup from "./cover-controls";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

export default function CoverImage({
  page,
  onRemoveCoverAsync,
}: {
  page: Page;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const {mutateAsync} = usePatchPage(({id, patch})=>patchPage(id, patch))
  const mutateAsyncRef = useRef(mutateAsync)
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingCoverImage, setPendingCoverImage] = useState<string | null>(
    null,
  );
  const [localPositionY, setLocalPositionY] = useState<number | null>(null);

  const coverImage = pendingCoverImage ?? page.cover.coverImage;
  const positionY = localPositionY ?? (page.cover)?.positionY ?? 50;

  const onCoverImageChange = useCallback((url: string) => {
    setPendingCoverImage(url);
  }, []);

  const handlePositionChange = useCallback((y: number) => {
    setLocalPositionY(y);
  }, []);

  const handlePositionDragEnd = useCallback(async () => {
    const y = localPositionY ?? (page.cover)?.positionY ?? 50;
    await mutateAsyncRef.current({
      id: page.id,
      patch: {cover: { ...page.cover, positionY: y }}
    });
    setLocalPositionY(null);
  }, [page, localPositionY]);

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
