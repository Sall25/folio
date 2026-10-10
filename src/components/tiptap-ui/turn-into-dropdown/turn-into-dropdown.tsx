import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useTurnIntoDropdown } from "./use-turn-into-dropdown";
import type { BlockTypeOption } from "./types";
import type { Level } from "@tiptap/extension-heading";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { useRef } from "react";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";

import "./turn-into-dropdown.scss";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { toggleList } from "../list-button";
import { toggleCodeBlock } from "../code-block-button";
import { TurnIntoPageButton } from "../turn-into-page-button";
import { useTranslation } from "react-i18next";
import { useEditorState } from "@tiptap/react";
import { getSelectedBlocks } from "src/lib/block-selection";
import { turnBlocksInto } from "./turn-blocks-into";

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
    case "callout":
      return "blockTypes.callout";
    case "codeBlock":
      return "blockTypes.codeBlock";
    default:
      return null;
  }
}

// Callouts and quotes wrap other blocks. Before turning one into something
// else, take its blocks out (keeping every word), so a callout turned into a
// quote becomes a quote, not a quote inside a callout.
const WRAPPERS = ["callout", "blockquote"];

function unwrapAround(editor: Editor): string | null {
  const { state } = editor;
  const { selection } = state;
  let pos: number | null = null;
  let wrapper = null;

  // Selected as a whole (drag handle), or the cursor is somewhere inside.
  const selected = (selection as { node?: typeof state.doc }).node;
  if (selected && WRAPPERS.includes(selected.type.name)) {
    pos = selection.from;
    wrapper = selected;
  } else {
    const { $from } = selection;
    for (let d = $from.depth; d > 0; d--) {
      if (WRAPPERS.includes($from.node(d).type.name)) {
        pos = $from.before(d);
        wrapper = $from.node(d);
        break;
      }
    }
  }
  if (pos === null || !wrapper) return null;

  const from = pos;
  const inner = wrapper.content;
  editor
    .chain()
    .command(({ tr }) => {
      tr.replaceWith(from, from + wrapper.nodeSize, inner);
      // Select the unwrapped blocks so the next step applies to all of them.
      const end = from + inner.size;
      tr.setSelection(
        TextSelection.between(
          tr.doc.resolve(from + 1),
          tr.doc.resolve(end - 1),
        ),
      );
      return true;
    })
    .run();
  return wrapper.type.name;
}

function turnInto(editor: Editor, option: BlockTypeOption) {
  // Several whole blocks (drag-box, Shift+click on grips): each of them.
  if (getSelectedBlocks(editor.state.selection)) {
    turnBlocksInto(editor, option);
    return;
  }
  const target = option.type;
  // Already this wrapper: nothing to do.
  if (WRAPPERS.includes(target) && editor.isActive(target)) return;
  const unwrapped =
    ["paragraph", "callout", "blockquote"].includes(target) &&
    unwrapAround(editor) !== null;

  switch (option.type) {
    case "paragraph":
      editor.chain().focus().setParagraph().run();
      break;
    case "callout":
      editor.chain().focus().wrapIn("callout").run();
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
    case "taskList":
      toggleList(editor, "taskList");
      break;
    case "blockquote":
      editor.chain().focus().wrapIn("blockquote").run();
      break;
    case "codeBlock":
      toggleCodeBlock(editor);
      break;
  }

  // Unwrapping selected the blocks so the new type applied to all of them;
  // leave a cursor at the end instead of highlighted text.
  if (unwrapped) {
    editor.commands.setTextSelection(editor.state.selection.to);
  }
}

export function TurnIntoDropdown({
  editor: providedEditor,
  hideWhenUnavailable = false,
  blockTypes = [
    "paragraph",
    "heading",
    "blockquote",
    "callout",
    "codeBlock",
    "orderedList",
    "bulletList",
    "taskList",
  ],
  useCardLayout = false,
  onOpenChange,
}: TurnIntoDropdownProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible, filteredOptions, Icon } = useTurnIntoDropdown({
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

  // "Turn into page" makes a page from one paragraph: not offered for
  // several blocks.
  const isBlockSelection =
    useEditorState({
      editor,
      selector: ({ editor }) =>
        !!editor && getSelectedBlocks(editor.state.selection) !== null,
    }) ?? false;

  const { t } = useTranslation();

  if (!isVisible && hideWhenUnavailable) return null;

  // A row of the block menu whose options open as a side flyout.
  return (
    <NavigableMenuItem
      Icon={Icon}
      label={t("blockMenu.turnInto")}
      side="right"
      align="start"
      sideOffset={8}
      collisionPadding={8}
      zIndex={10000}
    >
      {/* Same class as the old dropdown's content: card colours, widths. */}
      <div
        ref={containerRef}
        tabIndex={0}
        className={`${useCardLayout ? "tiptap-card" : ""} turninto-content`}
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
          {!isBlockSelection && (
            <DropdownMenuItem asChild>
              <TurnIntoPageButton
                editor={editor}
                text={t("blockTypes.turnIntoPage")}
                hideWhenUnavailable={false}
                style={{ minWidth: "145px" }}
              />
            </DropdownMenuItem>
          )}
        </Card>
      </div>
    </NavigableMenuItem>
  );
}