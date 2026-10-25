import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsRight,
  Ellipsis,
  Link as LinkIcon,
  Maximize2,
  PanelRight,
  RectangleHorizontal,
  SquareSquare,
  type LucideIcon,
} from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import type { Page } from "src/types";
import { useToast } from "src/features/shell/toast";
import { useActivePageActions } from "./context/active-page-context";
import { usePageViewActions } from "./context/page-view-context";
import { FavoriteToggle } from "./favorite-toggle";
import { ShareButton } from "./share/share-button";
import {
  moveRecordOpener,
  openerRecordOrder,
} from "src/features/database/utils/record-opener";
import "./peek-toolbar.scss";

// The bar on top of a page opened beside the page (side view) or over it
// (center view): close (side view only) · open as a full page │ how to open
// it (a menu: side, center, full page — its button shows the current one)
// ……… Share · copy link · favorite · more.

type OpenMode = "Peek" | "Center" | "Full";

/** Each way of opening a page, with its picture: a panel on the right, a
 *  window in the middle, the whole page. */
const OPEN_MODES: { mode: OpenMode; Icon: LucideIcon; label: string }[] = [
  { mode: "Peek", Icon: PanelRight, label: "peek.side" },
  { mode: "Center", Icon: SquareSquare, label: "peek.center" },
  { mode: "Full", Icon: RectangleHorizontal, label: "peek.full" },
];
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

  const openAs = (next: OpenMode) => {
    if (!pageId || next === mode) return;
    if (next === "Full") openFull();
    else setTarget({ pageId, view: next });
  };
  const CurrentIcon =
    OPEN_MODES.find((m) => m.mode === mode)?.Icon ?? PanelRight;

  // A database row opened from a view: step to the row above or below it
  // in that view (its filters and sort), staying in this side / center view.
  const order = pageId ? openerRecordOrder(pageId) : null;
  const index = order && pageId ? order.indexOf(pageId) : -1;
  const prevId = index > 0 ? order![index - 1] : null;
  const nextId =
    index !== -1 && order && index < order.length - 1 ? order[index + 1] : null;
  const goTo = (id: string | null) => {
    if (!id) return;
    moveRecordOpener(id);
    setTarget({ pageId: id, view: mode });
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="peek-toolbar__btn"
              tooltip={t("peek.switchMode")}
              disabled={!pageId}
            >
              <CurrentIcon className="tiptap-button-icon" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <Card className="peek-toolbar__menu">
              <CardItemGroup style={{ width: "100%" }}>
                {OPEN_MODES.map(({ mode: m, Icon, label }) => (
                  <DropdownMenuItem key={m} asChild>
                    <Button
                      variant="ghost"
                      className="peek-toolbar__menu-item"
                      data-active-state={m === mode ? "on" : "off"}
                      onClick={() => openAs(m)}
                    >
                      <Icon className="tiptap-button-icon" />
                      <span className="tiptap-button-text">{t(label)}</span>
                      {m === mode && (
                        <Check className="peek-toolbar__menu-check" size={14} />
                      )}
                    </Button>
                  </DropdownMenuItem>
                ))}
              </CardItemGroup>
            </Card>
          </DropdownMenuContent>
        </DropdownMenu>
        {index !== -1 && (
          <>
            <Separator orientation="vertical" className="peek-toolbar__sep" />
            <Button
              variant="ghost"
              className="peek-toolbar__btn"
              tooltip={t("peek.previous")}
              disabled={!prevId}
              onClick={() => goTo(prevId)}
            >
              <ChevronUp className="tiptap-button-icon" />
            </Button>
            <Button
              variant="ghost"
              className="peek-toolbar__btn"
              tooltip={t("peek.next")}
              disabled={!nextId}
              onClick={() => goTo(nextId)}
            >
              <ChevronDown className="tiptap-button-icon" />
            </Button>
          </>
        )}
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
