import {
  ChevronsRight,
  Ellipsis,
  Link as LinkIcon,
  Maximize2,
  PanelRight,
  RectangleHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import type { Page } from "src/types";
import { useToast } from "src/features/shell/toast";
import { useActivePageActions } from "./context/active-page-context";
import { usePageViewActions } from "./context/page-view-context";
import { FavoriteToggle } from "./favorite-toggle";
import { ShareButton } from "./share/share-button";
import "./peek-toolbar.scss";

// The bar on top of a page opened beside the page (side view) or over it
// (center view): close (side view only) · open as a full page │ switch to the
// other view ……… Share · copy link · favorite · more.
export function PeekToolbar({
  mode,
  pageId,
  page,
  onClose,
}: {
  mode: "Peek" | "Center";
  pageId: string | null;
  page: Page | null;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { show } = useToast();
  const { setTarget } = usePageViewActions();
  const { setActivePageId } = useActivePageActions();

  const openFull = () => {
    if (!pageId) return;
    setTarget(undefined);
    setActivePageId(pageId);
  };

  const switchMode = () => {
    if (!pageId) return;
    setTarget({ pageId, view: mode === "Peek" ? "Center" : "Peek" });
  };

  const copyLink = async () => {
    if (!pageId) return;
    const url = `${window.location.origin}/page/${pageId}`;
    try {
      await navigator.clipboard.writeText(url);
      show(t("share.linkCopied"), "success");
    } catch {
      show(url, "info");
    }
  };

  return (
    <div className="peek-toolbar" data-mode={mode}>
      <div className="peek-toolbar__group">
        {mode === "Peek" && (
          <Button
            variant="ghost"
            className="peek-toolbar__btn"
            tooltip={t("peek.close")}
            onClick={onClose}
          >
            <ChevronsRight className="tiptap-button-icon" />
          </Button>
        )}
        <Button
          variant="ghost"
          className="peek-toolbar__btn"
          tooltip={t("peek.openFull")}
          disabled={!pageId}
          onClick={openFull}
        >
          <Maximize2 className="tiptap-button-icon" />
        </Button>
        <Separator orientation="vertical" className="peek-toolbar__sep" />
        <Button
          variant="ghost"
          className="peek-toolbar__btn"
          tooltip={t("peek.switchMode")}
          disabled={!pageId}
          onClick={switchMode}
        >
          {mode === "Peek" ? (
            <RectangleHorizontal className="tiptap-button-icon" />
          ) : (
            <PanelRight className="tiptap-button-icon" />
          )}
        </Button>
      </div>

      <div className="peek-toolbar__group">
        {page ? (
          <>
            <ShareButton page={page} />
            <Button
              variant="ghost"
              className="peek-toolbar__btn"
              tooltip={t("share.copyLink")}
              onClick={() => void copyLink()}
            >
              <LinkIcon className="tiptap-button-icon" />
            </Button>
            <FavoriteToggle page={page} />
          </>
        ) : (
          <>
            <Bone width={56} height={24} rounded />
            <Bone width={28} height={28} rounded />
          </>
        )}
        <Button variant="ghost" className="peek-toolbar__btn">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </div>
    </div>
  );
}
