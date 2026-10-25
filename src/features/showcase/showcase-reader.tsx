import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "src/components/icons";
import { ShowcaseViewer } from "./showcase-viewer";
import {
  getShowcase,
  showcaseLang,
  showcaseTitle,
  type ShowcaseId,
} from "./showcases";
import "./showcase-reader.scss";

// Opens a showcase page over the app (home page Learn cards): a large
// read-only sheet on desktop, full screen on phones. Esc, the X or a click
// on the backdrop closes it.
export function ShowcaseReader({
  id,
  onClose,
}: {
  id: ShowcaseId | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = showcaseLang(i18n.language);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!id) return null;

  return createPortal(
    <div className="showcase-reader" role="presentation" onClick={onClose}>
      <div
        className="showcase-reader__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={showcaseTitle(id, lang)}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="showcase-reader__close"
          aria-label={t("actions.close", "Close")}
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="showcase-reader__body">
          <ShowcaseViewer content={getShowcase(id, lang)} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
