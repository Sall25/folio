import type { Editor } from "@tiptap/core";
import { useTurnIntoDropdown } from "./use-turn-into-dropdown";
import type { BlockTypeOption } from "./types";
import { ChevronRight } from "lucide-react";
import type { Level } from "@tiptap/extension-heading";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { useRef } from "react";
import { useHoverMenu } from "../color-dropdown-menu/useHoverMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/tiptap-ui-primitive/dropdown-menu";

import "./turn-into-dropdown.scss";
import { Card } from "@/components/tiptap-ui-primitive/card";
import { toggleBlockquote } from "../blockquote-button";
import { toggleList } from "../list-button";
import { toggleCodeBlock } from "../code-block-button";

interface TurnIntoDropdownProps {
  editor?: Editor | null;
  hideWhenUnavailable?: boolean;
  blockTypes?: string[];
  portal?: boolean;
  useCardLayout?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

function turnInto(editor: Editor, option: BlockTypeOption) {
  switch (option.type) {
    case "paragraph":
      editor.chain().focus().setParagraph().run();
      break;
    case "heading":
      editor
        .chain()
        .focus()
        .toggleHeading({ level: (option.level as Level) ?? 1 })
        .run();
      break;
    case "bulletList":
      toggleList(editor, "bulletList");
      break;
    case "orderedList":
      toggleList(editor, "orderedList");
      //editor.chain().focus().toggleOrderedList().run();
      break;
    case "tasklist":
      toggleList(editor, "taskList");
      break;
    case "blockquote":
      toggleBlockquote(editor);
      //editor.chain().focus().toggleBlockquote().run();
      break;
    case "codeBlock":
      toggleCodeBlock(editor);
      break;
  }
  console.log("turn into called");
}

export function TurnIntoDropdown({
  editor: providedEditor,
  hideWhenUnavailable = false,
  blockTypes = [
    "paragraph",
    "heading",
    "blockquote",
    "codeBlock",
    "orderedList",
    "bulletList",
    "taskList",
  ],
  useCardLayout = false,
  onOpenChange,
}: TurnIntoDropdownProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible, canToggle, filteredOptions, label, Icon } =
    useTurnIntoDropdown({
      editor,
      hideWhenUnavailable,
      blockTypes,
      onOpenChange,
    });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const { selectedIndex } = useMenuNavigation({
    editor,
    containerRef,
    items: filteredOptions,
    autoSelectFirstItem: false,
    orientation: "vertical",
    onSelect(item) {
      if (editor) {
        turnInto(editor, item);
      }
    },
  });

  const { open, setOpen, handleMouseEnter, handleMouseLeave } =
    useHoverMenu(150);

  if (!isVisible && hideWhenUnavailable) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        asChild
      >
        <Button
          type="button"
          variant="ghost"
          disabled={!canToggle}
          aria-label={label}
          className="menu-button"
        >
          <Icon className="tiptap-button-icon" />
          <span>Turn into</span>
          <ChevronRight className="tiptap-button-icon chevron" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
        side="right"
        align="center"
        className={`${useCardLayout ? "tiptap-card" : ""} turninto-content`}
        sideOffset={8}
      >
        <Card
          style={{
            alignItems: "flex-start",
            padding: "10px",
          }}
        >
          {filteredOptions.map((option, index) => {
            const isActive = editor ? option.isActive(editor) : false;
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={`${option.type}-${option.level ?? "default"}`}
                asChild
              >
                <Button
                  role="button"
                  variant="ghost"
                  onClick={() => editor && turnInto(editor, option)}
                  data-highlighted={isActive || selectedIndex === index}
                  style={{
                    minWidth: "145px",
                    justifyContent: "flex-start",
                  }}
                >
                  {Icon && <Icon className="tiptap-button-icon" />}
                  <span>{option.label}</span>
                </Button>
              </DropdownMenuItem>
            );
          })}
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
