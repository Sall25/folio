import type { Page } from "src/types";
import { useActivePageState } from "../../context/active-page-context";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Globe, LockIcon, Users } from "src/components/icons";
import { SharePanel } from "../share-panel";

// The one Share button (toolbar, peek and center views). `page` is the page
// it shares — the peek and center views pass theirs; the toolbar uses the
// open page. The icon says how open the page is.
export function ShareButton({ page: providedPage }: { page?: Page }) {
  const { activePage } = useActivePageState();
  const page = providedPage ?? activePage ?? null;
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Switching to another page closes the panel.
  const pageId = page?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pageId]);

  if (!page) return null;

  const Icon =
    page.generalAccess === "public"
      ? Globe
      : page.generalAccess === "private"
        ? LockIcon
        : Users;

  return (
    <>
      <Button
        ref={anchorRef}
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        tooltip={t("share.share", "Share")}
        size="large"
        aria-expanded={open}
        style={{
          border: "1px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-sm)",
          minHeight: 22,
          height: 25,
          color: "var(--tt-text-primary)",
        }}
      >
        <Icon
          className="tiptap-button-icon"
          style={{
            width: 14,
            height: 14,
            color: "var(--tt-text-primary)",
          }}
        />
        <span className="tiptap-button-text">{t("share.share", "Share")}</span>
      </Button>
      <SharePanel
        page={page}
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
