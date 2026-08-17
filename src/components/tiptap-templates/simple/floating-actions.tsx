"use client";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Image, MessageSquareText, Smile } from "lucide-react";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { IconPickerCard } from "src/components/tiptap-ui/cover/icon-picker-card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./floating-actions.scss";
import type { Page } from "src/types";
import { useActivePageState } from "./context/active-page-context";
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
              <span>Add icon</span>
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
          <span>Add cover</span>
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
