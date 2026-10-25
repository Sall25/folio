import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./image-lightbox.scss";

// The image at full size over a dark backdrop. Esc, the close button or a
// click outside the picture closes it.

/** Fired on an image's wrapper element to open its lightbox. */
export const OPEN_LIGHTBOX_EVENT = "folio:image-lightbox";

interface ImageLightboxProps {
  src: string;
  alt?: string | null;
  caption?: string | null;
  onClose: () => void;
}

export function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture phase + stop: Esc must not also clear the editor selection.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || caption || "Image"}
      // Rendered through a portal from inside the image's node view, so React
      // would bubble these to the image (and reselect it). Stop them here.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Button
        ref={closeRef}
        type="button"
        variant="ghost"
        className="image-lightbox__close"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="tiptap-button-icon" />
      </Button>

      <figure
        className="image-lightbox__figure"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img className="image-lightbox__img" src={src} alt={alt ?? ""} />
        {caption && (
          <figcaption className="image-lightbox__caption">{caption}</figcaption>
        )}
      </figure>
    </div>,
    document.body,
  );
}
