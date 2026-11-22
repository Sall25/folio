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
// WHAT IS NOT MOVED
//
// The view stays exactly where it is in the page: the wrapper is always
// rendered, `display: contents` while closed so it changes nothing, and
// fixed over the page while open. Only the backdrop is portalled.
//
// Moving the view itself into a portal would be the obvious way to do this,
// and it is the one thing that must not happen here. A timeline and a
// calendar hold their records in a NodeViewContent — the element the editor
// writes into. React moving a subtree to another parent unmounts it and
// builds it again, so the editor would be left holding an element that is no
// longer in the document, and the records inside it would go with it.

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

  return (
    <>
      {open &&
        createPortal(<Scrim onClose={onClose} label={label} />, document.body)}
      <div
        className="db-stage"
        data-open={open || undefined}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={open ? label : undefined}
      >
        {children}
      </div>
    </>
  );
}

/** The dark behind it, and the way out. */
function Scrim({ onClose, label }: { onClose: () => void; label: string }) {
  const { t } = useTranslation();
  return (
    <div
      className="db-stage-scrim"
      aria-label={label}
      // Portalled out of a node view: React would bubble these back into
      // the editor and reselect the node they came from.
      onClick={(e) => e.stopPropagation()}
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
