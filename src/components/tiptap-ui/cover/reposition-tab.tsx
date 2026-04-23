import { useCallback, useEffect, useRef } from "react";

interface RepositionTabProps {
  coverImage: string;
  positionY: number; // 0–100
  onPositionChange: (y: number) => void;
  onDragEnd?: () => void;
}

export function RepositionTab({
  coverImage,
  positionY,
  onPositionChange,
  onDragEnd,
}: RepositionTabProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startPos = useRef(positionY);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const applyDelta = useCallback(
    (clientY: number) => {
      const h = previewRef.current?.offsetHeight ?? 1;
      const dy = startY.current - clientY;
      // update local display immediately — no async call here
      onPositionChange(clamp(startPos.current + (dy / h) * 100));
    },
    [onPositionChange],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      applyDelta(e.clientY);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      applyDelta(e.clientY); // final position
      onDragEnd?.(); // ← new prop, called only on release
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [applyDelta, onDragEnd]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startPos.current = positionY;
  };

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPositionChange(clamp(((e.clientX - r.left) / r.width) * 100));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Preview */}
      <div
        ref={previewRef}
        onMouseDown={onMouseDown}
        style={{
          position: "relative",
          height: 140,
          borderRadius: 8,
          overflow: "hidden",
          cursor: "ns-resize",
          userSelect: "none",
        }}
      >
        <img
          src={coverImage}
          alt="cover preview"
          draggable={false}
          style={{
            width: "100%",
            height: "200%",
            objectFit: "cover",
            position: "absolute",
            left: 0,
            top: `${-(positionY / 100) * 50}%`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.15s",
          }}
          className="reposition-hint"
        >
          <span
            style={{
              background: "rgba(0,0,0,0.5)",
              color: "#fff",
              fontSize: 12,
              borderRadius: 20,
              padding: "4px 12px",
            }}
          >
            ↕ Drag to reposition
          </span>
        </div>
      </div>

      {/* Slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{ fontSize: 12, color: "var(--tt-theme-muted)", minWidth: 56 }}
        >
          Position
        </span>
        <div
          onClick={onTrackClick}
          style={{
            flex: 1,
            height: 4,
            background: "var(--tt-border-color)",
            borderRadius: 2,
            position: "relative",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${positionY}%`,
              background: "var(--tt-brand-color-500)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${positionY}%`,
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--tt-theme-bg)",
              border: "1.5px solid var(--tt-brand-color-500)",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--tt-theme-muted)",
            minWidth: 32,
            textAlign: "right",
          }}
        >
          {Math.round(positionY)}%
        </span>
      </div>

      <style>{`
        div:hover > .reposition-hint { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
