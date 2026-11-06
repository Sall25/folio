import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import "./avatar-crop-dialog.scss";

// "Change photo" → this dialog: drag the picture inside the circle, zoom
// with the slider (or the wheel, or + and −), Save. The saved photo is the
// circle's square at OUTPUT_SIZE px, so it's small and sharp everywhere.

const STAGE = 280; // the square the photo moves in (CSS px)
const CROP = 224; // the circle's diameter, centred in the stage
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;
const KEY_STEP = 10;

interface Offset {
  x: number;
  y: number;
}

/** Keeps the circle covered by the photo. */
function clampOffset(o: Offset, shownW: number, shownH: number): Offset {
  const maxX = Math.max(0, (shownW - CROP) / 2);
  const maxY = Math.max(0, (shownH - CROP) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, o.x)),
    y: Math.min(maxY, Math.max(-maxY, o.y)),
  };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (webp) => {
        // Browsers without WebP encoding hand back a PNG: use JPEG instead.
        if (webp && webp.type === "image/webp") return resolve(webp);
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      },
      "image/webp",
      0.9,
    );
  });
}

export function AvatarCropDialog({
  file,
  onCancel,
  onChooseAnother,
  onSave,
}: {
  /** The picked picture; the dialog is open while there is one. */
  file: File | null;
  onCancel: () => void;
  onChooseAnother: () => void;
  onSave: (cropped: File) => void;
}) {
  const { t } = useTranslation();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  // Load the picked file. A new file starts centred, unzoomed.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    let alive = true;
    img.onload = () => {
      if (!alive) return;
      setImage(img);
      setFailed(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => alive && setFailed(true);
    img.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [file]);

  // The photo at zoom 1 just covers the circle.
  const base = image
    ? Math.max(CROP / image.naturalWidth, CROP / image.naturalHeight)
    : 1;
  const scale = base * zoom;
  const shownW = image ? image.naturalWidth * scale : CROP;
  const shownH = image ? image.naturalHeight * scale : CROP;

  const setZoomKeepingInside = useCallback(
    (next: number) => {
      if (!image) return;
      const z = Math.min(MAX_ZOOM, Math.max(1, next));
      const s = base * z;
      setZoom(z);
      setOffset((o) =>
        clampOffset(o, image.naturalWidth * s, image.naturalHeight * s),
      );
    },
    [image, base],
  );

  const moveBy = (dx: number, dy: number) =>
    setOffset((o) => clampOffset({ x: o.x + dx, y: o.y + dy }, shownW, shownH));

  const save = async () => {
    if (!image || !file || saving) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // The circle's square, in the picture's own pixels.
      const sx = (shownW / 2 - offset.x - CROP / 2) / scale;
      const sy = (shownH / 2 - offset.y - CROP / 2) / scale;
      const size = CROP / scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const blob = await toBlob(canvas);
      if (!blob) return;
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      onSave(new File([blob], `avatar.${ext}`, { type: blob.type }));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, onCancel]);

  if (!file) return null;

  return createPortal(
    <div
      className="avatar-crop"
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <Card
        className="avatar-crop__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="avatar-crop-title" className="avatar-crop__title">
          {t("settings.account.cropTitle", "Adjust your photo")}
        </h2>

        <div
          className="avatar-crop__stage"
          style={{ width: STAGE, height: STAGE }}
          tabIndex={0}
          aria-label={t(
            "settings.account.cropStage",
            "Photo position. Arrow keys move it, + and − zoom.",
          )}
          onPointerDown={(e) => {
            if (!image) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            moveBy(e.clientX - d.x, e.clientY - d.y);
            drag.current = { id: d.id, x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => setZoomKeepingInside(zoom - e.deltaY * 0.002)}
          onKeyDown={(e) => {
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [KEY_STEP, 0],
              ArrowRight: [-KEY_STEP, 0],
              ArrowUp: [0, KEY_STEP],
              ArrowDown: [0, -KEY_STEP],
            };
            if (moves[e.key]) {
              e.preventDefault();
              moveBy(...moves[e.key]);
            } else if (e.key === "+" || e.key === "=") {
              setZoomKeepingInside(zoom + 0.1);
            } else if (e.key === "-") {
              setZoomKeepingInside(zoom - 0.1);
            } else if (e.key === "Enter") {
              void save();
            }
          }}
        >
          {image && (
            <img
              className="avatar-crop__img"
              src={image.src}
              alt=""
              draggable={false}
              style={{
                width: shownW,
                height: shownH,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
          <span
            className="avatar-crop__mask"
            style={{ width: CROP, height: CROP }}
            aria-hidden="true"
          />
          {failed && (
            <span className="avatar-crop__error">
              {t(
                "settings.account.cropFailed",
                "This file can't be opened as a picture. Choose another one.",
              )}
            </span>
          )}
        </div>

        <label className="avatar-crop__zoom">
          <span aria-hidden="true">−</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!image}
            aria-label={t("settings.account.cropZoom", "Zoom")}
            onChange={(e) => setZoomKeepingInside(Number(e.target.value))}
          />
          <span aria-hidden="true">+</span>
        </label>

        <div className="avatar-crop__actions">
          <Button variant="ghost" onClick={onChooseAnother}>
            <span className="tiptap-button-text">
              {t("settings.account.cropChooseAnother", "Choose another")}
            </span>
          </Button>
          <span className="avatar-crop__actions-end">
            <Button variant="ghost" onClick={onCancel}>
              <span className="tiptap-button-text">
                {t("actions.cancel", "Cancel")}
              </span>
            </Button>
            <Button
              variant="primary"
              disabled={!image || saving}
              onClick={() => void save()}
            >
              <span className="tiptap-button-text">
                {t("settings.account.cropSave", "Save")}
              </span>
            </Button>
          </span>
        </div>
      </Card>
    </div>,
    document.body,
  );
}
