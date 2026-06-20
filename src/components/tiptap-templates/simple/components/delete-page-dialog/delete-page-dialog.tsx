import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "src/components/tiptap-ui-primitive/button";

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
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)",
        }}
      >
        <div>
          <h2
            id="delete-page-title"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--tt-text-primary)",
            }}
          >
            Delete this page?
          </h2>
          <p
            id="delete-page-desc"
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--tt-text-secondary)",
            }}
          >
            <strong
              style={{ color: "var(--tt-text-primary)", fontWeight: 600 }}
            >
              {pageTitle || "Untitled"}
            </strong>{" "}
            and everything inside it will be permanently deleted. This can't be
            undone.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--tt-radius-md)",
              background: "var(--tt-danger-color, #ef4444)",
              color: "#fff",
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
