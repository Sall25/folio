import type { Page } from "src/types";
import { useActivePageState } from "../../context/active-page-context";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { LockIcon } from "lucide-react";
import { SharePanel } from "../share-panel";

export function ShareButton({ page: providedPage }: { page?: Page }) {
  const { activePage } = useActivePageState();
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  if (!activePage) return null;

  return (
    <>
      <Button
        ref={anchorRef}
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        tooltip={t("share.share", "Share")}
        size="large"
        style={{
          border: "1px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-sm)",
          minHeight: 22,
          height: 25,
          color: "var(--tt-text-primary)",
        }}
      >
        <LockIcon
          className="tiptap-button-icon"
          style={{
            width: 14,
            height: 14,
            // marginBottom: 3,
            color: "var(--tt-text-primary)",
          }}
        />
        <span className="tiptap-button-text">{t("share.share", "Share")}</span>
      </Button>
      <SharePanel
        page={providedPage ?? activePage}
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
