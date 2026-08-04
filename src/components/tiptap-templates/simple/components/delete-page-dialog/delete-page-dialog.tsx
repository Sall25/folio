import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface DeletePageDialogProps {
  open: boolean;
  pageTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePageDialog({
  open,
  pageTitle,
  onCancel,
  onConfirm,
}: DeletePageDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 15, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-page-title"
        aria-describedby="delete-page-desc"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "90vw",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--tt-card-bg-color)",
          border: "0.5px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-lg)",
          boxShadow: "var(--tt-shadow-elavated-md)",
        }}
      >
        <div>
          <p
            id="delete-page-desc"
            style={{
              margin: "8px 0 0",
              fontSize: 16,
              lineHeight: 1.4,
              textAlign: "center",
              color: "var(--tt-text-primary)",
            }}
          >
            Are you sure you want to permanently delete{" "}
            <strong
              style={{ color: "var(--tt-brand-color-400)", fontWeight: 600 }}
            >
              {pageTitle || "Untitled"}
            </strong>{" "}
            ?
          </p>
        </div>

        <CardItemGroup orientation="vertical">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--tt-radius-md)",

              border: "1px solid var(--tt-color-text-red, #ef4444)",
              color: "var(--tt-color-text-red)",

              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span
              className="tiptap-button-text"
              style={{ fontWeight: 500, textAlign: "center" }}
            >
              {" "}
              Permanently delete
            </span>
          </Button>
          <Spacer orientation="vertical" size={5} />
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--tt-radius-md)",
              color: "var(--tt-text-primary)",
              border: "1px solid var(--tt-border-color)",
            }}
          >
            Cancel
          </Button>
        </CardItemGroup>
      </div>
    </div>,
    document.body,
  );
}
