import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Maximize2, X } from "src/components/icons";
import "./view-stage.scss";

// A view, opened over the page.
//
// The same bargain the image lightbox makes — a dark backdrop, Escape, a
// click on the dark, a way out at the top right — for a whole view rather
// than one picture. A database view inside a page is always a window onto
// something bigger than the column it sits in: a graph runs off the edges, a
// timeline is a year squeezed into a paragraph's width, a month grid gets
// four lines a day. This gives any of them the screen for as long as it is
// wanted, and gives it back.
//
// WHY IT IS PORTALLED, AND WHY THAT IS SAFE
//
// Staying in place and going `position: fixed` does not work here: the
// editor is `contain: layout style`, and layout containment makes it the
// containing block for every fixed descendant. A view that tried it stayed
// in its column, trapped in the editor's stacking context, under the very
// backdrop meant to be behind it.
//
// So the view is portalled to the body. The worry with that is the records:
// a timeline and a calendar hold theirs in a NodeViewContent, and moving a
// subtree to another parent unmounts it and builds it again. It survives —
// what the editor writes into is its own element, which it re-appends
// whenever React hands the content ref a new wrapper (@tiptap/react's
// nodeViewContentRef). React owns the wrapper; the editor owns what is
// inside it.

export function ViewStage({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** What this is, for whoever is listening rather than looking. */
  label: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Caught on the way down and stopped: Escape here must not also clear
      // the editor's selection underneath.
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return <>{children}</>;

  return createPortal(
    <Scrim onClose={onClose} label={label}>
      {children}
    </Scrim>,
    document.body,
  );
}

/** The dark, the way out, and the view in the middle of it. */
function Scrim({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="db-stage-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Portalled out of a node view: React would bubble these back into
      // the editor and reselect the node they came from.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Button
        variant="ghost"
        className="db-stage-scrim__close"
        aria-label={t("database.stage.close")}
        onClick={onClose}
      >
        <X className="tiptap-button-icon" />
      </Button>
      <div className="db-stage">{children}</div>
    </div>
  );
}

/** The button that opens a view over the page. */
export function ViewStageButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      aria-label={t("database.stage.open")}
      title={t("database.stage.open")}
      onClick={onOpen}
    >
      <Maximize2 className="tiptap-button-icon" size={15} />
    </Button>
  );
}
