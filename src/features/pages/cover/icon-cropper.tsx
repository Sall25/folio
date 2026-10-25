import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./icon-cropper.scss";

/** The framing area and the circle inside it, in CSS px. */
const VIEW = 240;
const CIRCLE = 200;
/** Side of the square image that gets uploaded. */
const OUTPUT = 256;
const MAX_ZOOM = 4;

interface Size {
  w: number;
  h: number;
}

/**
 * Frames an image inside a circle before it becomes an icon: drag to move,
 * slide (or scroll) to zoom. The circle is always covered by the picture.
 * "Use as icon" hands back a small square image (OUTPUT × OUTPUT) cut to the
 * circle's bounding square, so every uploaded icon fits its circle exactly.
 */
export function IconCropper({
  src,
  busy = false,
  onCancel,
  onConfirm,
}: {
  /** An object URL (or any same-origin URL) of the chosen image. */
  src: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  // At zoom 1 the picture's shorter side just fills the circle.
  const base = natural ? CIRCLE / Math.min(natural.w, natural.h) : 1;
  const shownAt = (z: number): Size =>
    natural
      ? { w: natural.w * base * z, h: natural.h * base * z }
      : { w: CIRCLE, h: CIRCLE };
  const shown = shownAt(zoom);

  // Keep the circle covered: the picture can't move further than its
  // overhang past the circle on each side.
  const clamp = useCallback((o: { x: number; y: number }, s: Size) => {
    const mx = Math.max(0, (s.w - CIRCLE) / 2);
    const my = Math.max(0, (s.h - CIRCLE) / 2);
    return {
      x: Math.min(mx, Math.max(-mx, o.x)),
      y: Math.min(my, Math.max(-my, o.y)),
    };
  }, []);

  // Zooming out can leave the circle uncovered: pull the picture back in
  // the same update.
  const applyZoom = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setOffset((o) => clamp(o, shownAt(next)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOffset(
      clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }, shown),
    );
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (busy) return;
    applyZoom(zoom - e.deltaY * 0.002);
  };

  // Arrow keys move the picture, + and - zoom: the same as the mouse.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key]!;
      setOffset((o) => clamp({ x: o.x + dx, y: o.y + dy }, shown));
    } else if (e.key === "+" || e.key === "=") {
      applyZoom(zoom + 0.1);
    } else if (e.key === "-") {
      applyZoom(zoom - 0.1);
    }
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    // The circle's square, in the image's own pixels.
    const scale = base * zoom;
    const side = CIRCLE / scale;
    const cx = natural.w / 2 - offset.x / scale;
    const cy = natural.h / 2 - offset.y / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      cx - side / 2,
      cy - side / 2,
      side,
      side,
      0,
      0,
      OUTPUT,
      OUTPUT,
    );
    // WebP where the browser can write it (small, keeps transparency),
    // otherwise PNG.
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === "image/webp") return onConfirm(webp);
        canvas.toBlob((png) => png && onConfirm(png), "image/png");
      },
      "image/webp",
      0.9,
    );
  };

  return (
    <div className="icon-cropper">
      <div
        className="icon-cropper__view"
        style={{ width: VIEW, height: VIEW }}
        tabIndex={0}
        role="group"
        aria-label={t(
          "iconCropper.frameAria",
          "Picture frame: arrow keys move it, + and - zoom",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          className="icon-cropper__img"
          onLoad={(e) =>
            setNatural({
              w: e.currentTarget.naturalWidth || CIRCLE,
              h: e.currentTarget.naturalHeight || CIRCLE,
            })
          }
          style={{
            width: shown.w,
            height: shown.h,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }}
        />
        <div
          className="icon-cropper__mask"
          style={{ ["--circle" as string]: `${CIRCLE / 2}px` }}
          aria-hidden="true"
        />
        <div
          className="icon-cropper__ring"
          style={{ width: CIRCLE, height: CIRCLE }}
          aria-hidden="true"
        />
      </div>

      <div className="icon-cropper__zoom">
        <Minus size={14} aria-hidden="true" />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={busy || !natural}
          aria-label={t("iconCropper.zoom", "Zoom")}
          onChange={(e) => applyZoom(Number(e.currentTarget.value))}
        />
        <Plus size={14} aria-hidden="true" />
      </div>
      <p className="icon-cropper__hint">
        {t("iconCropper.hint", "Drag to move, slide to zoom.")}
      </p>

      <div className="icon-cropper__actions">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          <span className="tiptap-button-text">
            {t("actions.cancel", "Cancel")}
          </span>
        </Button>
        <Button variant="primary" onClick={confirm} disabled={busy || !natural}>
          <span className="tiptap-button-text">
            {busy
              ? t("iconCropper.uploading", "Uploading…")
              : t("iconCropper.use", "Use as icon")}
          </span>
        </Button>
      </div>
    </div>
  );
}
