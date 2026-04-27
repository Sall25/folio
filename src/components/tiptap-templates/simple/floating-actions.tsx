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
import { useSimpleEditor } from "./context/simple-editor-context";

export function FloatingActions({
  // editorLeft,
  open,
  onOpenChange,
  target,
  onTargetChange,
  onSelect,
  onAddCoverAsync,
}: {
  editorLeft: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
  onAddCoverAsync: () => Promise<void>;
}) {
  const { activePage } = useSimpleEditor();
  const hasIcon = !!activePage?.cover.iconName;
  const hasCover = !!activePage?.cover.coverImage;

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
        <Button variant="ghost" onClick={async () => await onAddCoverAsync()}>
          <Image className="tiptap-button-icon" />
          <span>Add cover</span>
        </Button>
      )}

      <Button variant="ghost">
        <MessageSquareText className="tiptap-button-icon" />
        <span>Comment</span>
      </Button>
    </div>
  );
}
