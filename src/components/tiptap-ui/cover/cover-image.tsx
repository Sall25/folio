import { useState, useCallback, useEffect, useRef } from "react";
import type { Page } from "src/types";
import CoverControlsGroup from "./cover-controls";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { Bone } from "src/components/tiptap-ui-primitive/bone";
import { usePageCapabilities } from "src/hooks/use-page-role";

export default function CoverImage({
  page,
  onRemoveCoverAsync,
}: {
  page: Page;
  onRemoveCoverAsync: () => Promise<void>;
}) {
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const mutateAsyncRef = useRef(mutateAsync);
  const [btnPosition, setBtnPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingCoverImage, setPendingCoverImage] = useState<string | null>(
    null,
  );
  const [localPositionY, setLocalPositionY] = useState<number | null>(null);

  const coverImage = pendingCoverImage ?? page.cover.coverImage;
  const positionY = localPositionY ?? page.cover?.positionY ?? 50;

  // The <img> renders immediately but paints nothing until its bytes arrive —
  // 260px of blank while a full-width photo downloads. A bone fills the band in
  // the meantime. The image is always MOUNTED (so it actually loads); it's just
  // held at opacity 0 until it's ready, then faded in — swapping it out entirely
  // would restart the download.
  const [loaded, setLoaded] = useState(false);

  // Reset when the URL changes, so picking a new cover shows the skeleton again
  // rather than holding the previous image's loaded state. Render-time adjust,
  // not an effect — this is derived state, and setState-in-effect would cost an
  // extra render pass.
  const [prevSrc, setPrevSrc] = useState(coverImage);
  if (coverImage !== prevSrc) {
    setPrevSrc(coverImage);
    setLoaded(false);
  }

  const onCoverImageChange = useCallback((url: string) => {
    setPendingCoverImage(url);
  }, []);

  const handlePositionChange = useCallback((y: number) => {
    setLocalPositionY(y);
  }, []);

  const handlePositionDragEnd = useCallback(async () => {
    const y = localPositionY ?? page.cover?.positionY ?? 50;
    await mutateAsyncRef.current({
      id: page.id,
      patch: { cover: { ...page.cover, positionY: y } },
    });
    setLocalPositionY(null);
  }, [page, localPositionY]);

  const onPopoverOpenChange = useCallback(
    (open: boolean) => setPopoverOpen(open),
    [],
  );

  const { canEditContent, isLoading } = usePageCapabilities(page.id);

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
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          <Bone width="100%" height="100%" />
        </div>
      )}

      <img
        src={coverImage ?? ""}
        alt="cover"
        draggable={false}
        onLoad={() => setLoaded(true)}
        // A broken URL must not leave the bone shimmering forever.
        onError={() => setLoaded(true)}
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
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />

      {showControls && canEditContent && !isLoading && (
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
