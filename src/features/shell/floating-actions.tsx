"use client";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Image, MessageSquareText, Smile } from "src/components/icons";
import { useTranslation } from "react-i18next";
import type { Target } from "src/features/pages/cover/types";
import { IconPickerCard } from "src/features/pages/cover/icon-picker-card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./floating-actions.scss";
import type { Page } from "src/types";
import { useActivePageState } from "../pages/context/active-page-context";
import { usePageCapabilities } from "src/hooks/use-page-role";

export function FloatingActions({
  open,
  onOpenChange,
  target,
  onTargetChange,
  onSelect,
  onAddCoverAsync,
  providedPage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
  onAddCoverAsync: () => Promise<void>;
  providedPage?: Page;
}) {
  const { activePage, activePageId } = useActivePageState();
  const page = providedPage ?? activePage;

  const hasIcon = !!page?.cover.iconName;
  const hasCover = !!page?.cover.coverImage;

  const { canComment } = usePageCapabilities(activePageId);
  const { t } = useTranslation();

  return (
    <div
      className="floating-actions"
      style={{ paddingTop: hasIcon ? 8 : hasCover ? 8 : 48 }}
    >
      {!hasIcon && (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <Smile className="tiptap-button-icon" />
              <span>{t("ui.addIcon")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverPortal container={document.getElementById("modal-root")}>
            <PopoverContent
              style={{ position: "fixed", zIndex: 9999 }}
              side="bottom"
              align="start"
            >
              <IconPickerCard
                target={target}
                onTargetChange={onTargetChange}
                onSelect={onSelect}
              />
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      )}

      {!hasCover && (
        <Button
          variant="ghost"
          onClick={async () => {
            await onAddCoverAsync();
          }}
        >
          <Image className="tiptap-button-icon" />
          <span>{t("ui.addCover")}</span>
        </Button>
      )}

      {canComment && (
        <Button
          variant="ghost"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("folio:open-page-comment"));
          }}
        >
          <MessageSquareText className="tiptap-button-icon" />
          <span className="tiptap-button-text">Comment</span>
        </Button>
      )}
    </div>
  );
}
