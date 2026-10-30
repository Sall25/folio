import type { NodeViewProps } from "@tiptap/core";
import { localCopy } from "src/api/uploads";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { ImageOptions } from "./image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ImageNodeSkeleton } from "./image-node-skeleton";
import { ImageLightbox, OPEN_LIGHTBOX_EVENT } from "./image-lightbox";
import "./image-node.scss";
import { useIsMobile } from "src/hooks/use-breakpoint";

type Align = "left" | "center" | "right";
type WidthPreset = "25%" | "50%" | "75%" | "100%";

function ImageViewInner(props: NodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const imgRef = useRef<HTMLImageElement>(null);

  // The bubble menu's "View full size" fires this event on our wrapper.
  useEffect(() => {
    const wrapper = imgRef.current?.closest("[data-image-wrapper]");
    if (!wrapper) return;
    const open = () => setLightboxOpen(true);
    wrapper.addEventListener(OPEN_LIGHTBOX_EVENT, open);
    return () => wrapper.removeEventListener(OPEN_LIGHTBOX_EVENT, open);
  }, []);

  const src: string | null = props.node.attrs.src ?? null;

  // Bytes not in yet → show the skeleton instead of a zero-height <img>.
  // Reset during render (not in an effect) when the src changes, so swapping
  // the image shows its skeleton again rather than holding the old one's
  // "loaded" state. This is React's documented pattern for derived resets.
  const [loaded, setLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(false);
  }

  const resize = props.extension.options.resize as ImageOptions["resize"];
  const minWidth = typeof resize === "object" ? (resize.minWidth ?? 60) : 60;

  const align: Align = props.node.attrs.align ?? "left";
  const widthPreset: WidthPreset | null = props.node.attrs.widthPreset ?? null;
  const showCaption: boolean = props.node.attrs.showCaption ?? false;

  const isMobile = useIsMobile();
  const currentWidth: number | null = isMobile
    ? null
    : (props.node.attrs.width ?? null);

  // Natural dimensions, captured once on the image's first successful load and
  // persisted to the node. With them, every later load reserves the exact box
  // up front and the document never reflows when the image paints.
  const naturalWidth: number | null = props.node.attrs.naturalWidth ?? null;
  const naturalHeight: number | null = props.node.attrs.naturalHeight ?? null;
  const aspectRatio =
    naturalWidth && naturalHeight ? naturalWidth / naturalHeight : null;

  const isVisible = hovered; //|| props.selected || isResizing;

  const wrapperAlign: React.CSSProperties =
    align === "center"
      ? { marginLeft: "auto", marginRight: "auto" }
      : align === "right"
        ? { marginLeft: "auto" }
        : {};

  const startResize = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const wrapperEl = (e.currentTarget as HTMLElement).closest(
      "[data-image-wrapper]",
    ) as HTMLElement | null;
    const startWidth = wrapperEl?.offsetWidth ?? 300;

    setIsResizing(true);

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;

      const next = Math.max(
        minWidth,
        side === "right" ? startWidth + dx : startWidth - dx,
      );
      props.updateAttributes({ width: Math.round(next), widthPreset: null });
    };

    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const captionRef = useRef<HTMLTextAreaElement>(null);
  const caption: string = props.node.attrs.caption ?? "";

  // The Caption button turns the caption on; focus it once it has rendered
  // (the command runs before React mounts it). Only for the person who has
  // the image selected, so a collaborator's caption doesn't steal focus.
  const captionWasShown = useRef(showCaption);
  useEffect(() => {
    if (showCaption && !captionWasShown.current && props.selected) {
      requestAnimationFrame(() => captionRef.current?.focus());
    }
    captionWasShown.current = showCaption;
  }, [showCaption, props.selected]);

  // The caption grows with its text.
  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [caption, showCaption]);

  // Enter or Esc in the caption: back to the page, just after the image.
  const leaveCaption = (toNextLine: boolean) => {
    const pos = props.getPos();
    if (typeof pos !== "number") return;
    if (toNextLine) {
      const after = pos + props.node.nodeSize;
      props.editor
        .chain()
        .focus()
        .insertContentAt(after, { type: "paragraph" })
        .setTextSelection(after + 1)
        .run();
    } else {
      props.editor.chain().focus().setNodeSelection(pos).run();
    }
  };

  const STRIP: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "col-resize",
    zIndex: 10,
    opacity: isVisible ? 1 : 0,
    transition: "opacity 0.15s",
  };

  const BAR: React.CSSProperties = {
    width: 6,
    height: 48,
    borderRadius: 3,
    background: isResizing ? "#2eaadc" : "rgba(55,53,47,0.25)",
    transition: "background 0.1s",
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setLoaded(true);

    // Persist the real dimensions the first time we learn them, so the next
    // load of this node can reserve the correct box before any bytes arrive.
    if (
      img.naturalWidth &&
      img.naturalHeight &&
      (naturalWidth !== img.naturalWidth || naturalHeight !== img.naturalHeight)
    ) {
      props.updateAttributes({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      data-image-wrapper
      style={{
        display: "block",
        // Phones: the full column. "fit-content" around an <img> at 100%
        // makes each wait on the other's width, which WebKit (every iPhone
        // browser) can resolve to zero, so the image never shows.
        width: isMobile
          ? (widthPreset ?? "100%")
          : (widthPreset ??
            (currentWidth ? `${currentWidth}px` : "fit-content")),
        maxWidth: "100%",
        height: "fit-content",
        pointerEvents: "auto",
        borderRadius: 4,
        transition: "outline 0.1s ease",
        position: "relative",
        padding: 0,
        margin: 0,
        ...wrapperAlign,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => !isResizing && setHovered(false)}
      onClick={() => {
        // Read-only pages: a click opens the image. While editing, a click
        // selects it (for the bubble menu) and a double-click opens it.
        if (!props.editor.isEditable) {
          if (src && loaded) setLightboxOpen(true);
          return;
        }
        props.editor.commands.setNodeSelection(props.getPos()!);
      }}
      onDoubleClick={() => {
        if (src && loaded) setLightboxOpen(true);
      }}
    >
      {/* Left resize strip */}
      <div
        style={{ ...STRIP, left: -8 }}
        onMouseDown={(e) => startResize(e, "left")}
      >
        <div style={BAR} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Skeleton occupies the node's box until the bytes land. The <img> is
            always mounted (so it can actually load) but stays out of layout
            until it's ready — swapping display avoids a second request. */}
        {!loaded && src && <ImageNodeSkeleton aspectRatio={aspectRatio} />}

        <img
          ref={imgRef}
          // Just uploaded here: from the file itself, no download.
          src={localCopy(props.node.attrs.src) ?? props.node.attrs.src}
          alt={props.node.attrs.alt ?? ""}
          title={props.node.attrs.title ?? undefined}
          onLoad={handleLoad}
          onError={() => setLoaded(true)}
          loading="lazy"
          decoding="async"
          style={{
            ...(loaded
              ? { display: "block" }
              : {
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  pointerEvents: "none",
                }),
            width: "100%",
            cursor: props.editor.isEditable ? undefined : "zoom-in",
            height: "auto",
            borderRadius: 4,
          }}
        />

        {/* A real text field, not a contentEditable div: ProseMirror reads a
            selection inside a contentEditable as a cursor in the image node
            and takes focus back, so the caption couldn't be typed in. */}
        {showCaption && (props.editor.isEditable || caption) && (
          <textarea
            ref={captionRef}
            data-image-caption
            className="image-caption"
            rows={1}
            placeholder="Add a caption…"
            value={caption}
            readOnly={!props.editor.isEditable}
            onChange={(e) =>
              props.updateAttributes({ caption: e.target.value })
            }
            onFocus={() => {
              if (!props.selected) {
                props.editor.commands.setNodeSelection(props.getPos()!);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                leaveCaption(true);
              } else if (e.key === "Escape") {
                e.preventDefault();
                leaveCaption(false);
              } else if (e.key === "Backspace" && caption === "") {
                e.preventDefault();
                props.updateAttributes({ showCaption: false });
                leaveCaption(false);
              }
            }}
          />
        )}
      </div>

      {lightboxOpen && src && (
        <ImageLightbox
          src={src}
          alt={props.node.attrs.alt}
          caption={showCaption ? props.node.attrs.caption : null}
          onClose={closeLightbox}
        />
      )}

      {/* Right resize strip */}
      <div
        style={{ ...STRIP, right: -8 }}
        onMouseDown={(e) => startResize(e, "right")}
      >
        <div style={BAR} />
      </div>
    </NodeViewWrapper>
  );
}

export function ImageView(props: NodeViewProps) {
  const resize = props.extension.options.resize as ImageOptions["resize"];

  if (!resize) {
    return (
      <NodeViewWrapper>
        <NodeViewContent />
      </NodeViewWrapper>
    );
  }

  return <ImageViewInner {...props} />;
}
