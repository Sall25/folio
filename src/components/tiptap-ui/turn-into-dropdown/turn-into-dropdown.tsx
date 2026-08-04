import type { Editor } from "@tiptap/core";
import { useTurnIntoDropdown } from "./use-turn-into-dropdown";
import type { BlockTypeOption } from "./types";
import { ChevronRight } from "lucide-react";
import type { Level } from "@tiptap/extension-heading";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { useRef } from "react";
import { useHoverMenu } from "../color-dropdown-menu/useHoverMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

import "./turn-into-dropdown.scss";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { toggleBlockquote } from "../blockquote-button";
import { toggleList } from "../list-button";
import { toggleCodeBlock } from "../code-block-button";
import { TurnIntoPageButton } from "../turn-into-page-button";
import { useTranslation } from "react-i18next";

interface TurnIntoDropdownProps {
  editor?: Editor | null;
  hideWhenUnavailable?: boolean;
  blockTypes?: string[];
  portal?: boolean;
  useCardLayout?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

// Maps a block-type option to its i18n key (reuses the shared blockTypes group).
// Returns null for anything unmapped (e.g. heading levels 4–6) so we fall back
// to the option's own label.
function optionLabelKey(option: BlockTypeOption): string | null {
  switch (option.type) {
    case "paragraph":
      return "blockTypes.paragraph";
    case "heading": {
      const lvl = option.level ?? 1;
      if (lvl === 1) return "blockTypes.heading1";
      if (lvl === 2) return "blockTypes.heading2";
      if (lvl === 3) return "blockTypes.heading3";
      return null;
    }
    case "bulletList":
      return "blockTypes.bulletList";
    case "orderedList":
      return "blockTypes.orderedList";
    case "tasklist":
      return "blockTypes.taskList";
    case "blockquote":
      return "blockTypes.blockquote";
    case "codeBlock":
      return "blockTypes.codeBlock";
    default:
      return null;
  }
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
  const { isVisible, canToggle, filteredOptions, Icon } = useTurnIntoDropdown({
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

  const { t } = useTranslation();

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
          aria-label={t("blockMenu.turnInto")}
          className="menu-button"
        >
          <Icon className="tiptap-button-icon" />
          <span>{t("blockMenu.turnInto")}</span>
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
            const key = optionLabelKey(option);
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
                  <span>{key ? t(key) : option.label}</span>
                </Button>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem asChild>
            <TurnIntoPageButton
              editor={editor}
              text={t("blockTypes.turnIntoPage")}
              hideWhenUnavailable={false}
              onTurnedIntoPage={() => setOpen(false)}
              style={{ minWidth: "145px" }}
            />
          </DropdownMenuItem>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
