import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface ConfirmDialogProps {
  open: boolean;
  /** Main question/message. Either a plain string, or rich content (to bold a name). */
  message: React.ReactNode;
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Destructive styling (red outline) for the confirm button. Default true. */
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
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
        background: "rgba(15, 15, 15, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-dialog-desc"
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
          boxShadow: "var(--tt-shadow-elevated-lg)",
        }}
      >
        <p
          id="confirm-dialog-desc"
          style={{
            margin: "8px 0 0",
            fontSize: 16,
            lineHeight: 1.4,
            textAlign: "center",
            color: "var(--tt-text-primary)",
          }}
        >
          {message}
        </p>

        <CardItemGroup orientation="vertical">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--tt-radius-md)",
              border: destructive
                ? "1px solid var(--tt-color-text-red, #ef4444)"
                : "1px solid var(--tt-brand-color-400)",
              color: destructive
                ? "var(--tt-color-text-red, #ef4444)"
                : "var(--tt-brand-color-400)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span
              className="tiptap-button-text"
              style={{ fontWeight: 500, textAlign: "center" }}
            >
              {confirmLabel}
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
            {cancelLabel}
          </Button>
        </CardItemGroup>
      </div>
    </div>,
    document.body,
  );
}
