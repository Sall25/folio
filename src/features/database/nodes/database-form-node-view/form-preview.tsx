import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "src/components/icons";
import type { ID } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { FormPage } from "../../forms/form-page";
import "src/features/pages/page-create-modal.scss";
import "./form-preview.scss";

/** The form builder's Preview: the form as people fill it in, centered over
 *  the page, the way a page opens in center peek. */
export function FormPreview({
  sourceId,
  viewId,
  onClose,
}: {
  sourceId: ID;
  viewId: ID;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div
        className="page-create-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card
        className="page-create-modal form-preview"
        role="dialog"
        aria-modal="true"
        aria-label={t("database.form.preview")}
      >
        <div className="form-preview__bar">
          <span className="form-preview__label">
            {t("database.form.preview")}
          </span>
          <Button
            variant="ghost"
            size="small"
            aria-label={t("database.form.close")}
            tooltip={t("database.form.close")}
            onClick={onClose}
          >
            <X className="tiptap-button-icon" size={16} />
          </Button>
        </div>
        <CardBody style={{ width: "100%" }}>
          <FormPage sourceId={sourceId} viewId={viewId} onClose={onClose} />
        </CardBody>
      </Card>
    </>,
    document.body,
  );
}
