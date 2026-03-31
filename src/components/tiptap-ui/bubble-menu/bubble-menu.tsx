import type { Editor } from "@tiptap/core";
import { CodeBlockButton } from "src/components/tiptap-ui/code-block-button";
import {
  MarkButton,
  useMark,
  type UseMarkConfig,
} from "src/components/tiptap-ui/mark-button";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";

import { HeadingDropdownMenu } from "src/components/tiptap-ui/heading-dropdown-menu";
//import { BlockquoteButton } from "../blockquote-button";
import { BlockquoteButton } from "src/components/tiptap-ui/blockquote-button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { MoreOptionsIcon } from "src/components/tiptap-icons";
import { TextAlignButton } from "src/components/tiptap-ui/text-align-button";

import "./bubble-menu.scss";
import { ColorHighlightPopover } from "src/components/tiptap-ui/color-highlight-popover";
import { LinkPopover } from "src/components/tiptap-ui/link-popover";
import { ColorTextPopover } from "src/components/tiptap-ui/color-text-popover";
import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { CommentButton } from "src/components/tiptap-ui/comment-button";

interface MoreOptionsPopoverProps
  extends Omit<ButtonProps, "type">, UseMarkConfig {}

function MoreOptionsPopover({
  editor,
  hideWhenUnavailable = false,
}: MoreOptionsPopoverProps) {
  const { isVisible } = useMark({ hideWhenUnavailable, type: "bold" });

  if (!isVisible) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-appearance="default"
          role="button"
          tabIndex={-1}
          aria-label="More options"
          tooltip="More"
        >
          <MoreOptionsIcon className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card className="bubble-menu-content">
          <CardItemGroup orientation="horizontal">
            <MarkButton type="superscript" editor={editor} />
            <MarkButton type="subscript" editor={editor} />
            <Separator orientation="vertical" />
            <TextAlignButton align="left" editor={editor} />
            <TextAlignButton align="right" editor={editor} />
            <TextAlignButton align="center" editor={editor} />
            <TextAlignButton align="justify" editor={editor} />
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export function Group({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasVisible, setHasVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const children = Array.from(el.children).filter(
        (c) => !c.classList.contains("group-sep"),
      );
      const anyVisible = children.some(
        (c) => window.getComputedStyle(c).display !== "none",
      );
      setHasVisible(anyVisible);
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(el, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
      childList: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={ref} style={{ display: "contents" }}>
        {children}
      </div>
      {hasVisible && <Separator className="group-sep" orientation="vertical" />}
    </>
  );
}

export function BubbleMenu({ editor }: { editor: Editor | null }) {
  const [visible, setVisible] = useState(true);

  const onAction = useCallback(() => {
    setVisible(false);
    //editor?.commands.setTextSelection(editor.state.selection.anchor);
    editor?.commands.hoverThread();
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      setVisible(true);
      editor.commands.removeThread();
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      {visible && (
        <TiptapBubbleMenu
          editor={editor}
          shouldShow={({ state, editor }) => {
            if (
              editor.isActive("image") ||
              editor.isActive("figure") ||
              editor.isActive("table")
            ) {
              return false;
            }

            const selection = state.tr.selection;
            if (selection instanceof NodeSelection) {
              return false;
            }

            return !state.tr.selection.empty;
          }}
        >
          <Card className="bubble-menu-content">
            <CardItemGroup orientation="horizontal">
              {/* Group 1 — block type */}
              <Group>
                <HeadingDropdownMenu
                  hideWhenUnavailable={true}
                  editor={editor}
                />
                <BlockquoteButton hideWhenUnavailable={true} editor={editor} />
                <CodeBlockButton hideWhenUnavailable={true} editor={editor} />
              </Group>

              {/* Group 2 — inline marks */}
              <Group>
                <MarkButton
                  hideWhenUnavailable={true}
                  type="bold"
                  editor={editor}
                />
                <MarkButton
                  hideWhenUnavailable={true}
                  type="italic"
                  editor={editor}
                />
                <MarkButton
                  hideWhenUnavailable={true}
                  type="strike"
                  editor={editor}
                />
                <MarkButton
                  hideWhenUnavailable={true}
                  type="code"
                  editor={editor}
                />
                <MarkButton
                  hideWhenUnavailable={true}
                  type="underline"
                  editor={editor}
                />
              </Group>

              {/* Group 3 — enrichment */}
              <Group>
                <ColorHighlightPopover
                  hideWhenUnavailable={true}
                  editor={editor}
                  onApplied={onAction}
                />
                <ColorTextPopover hideWhenUnavailable={true} editor={editor} />
                <LinkPopover hideWhenUnavailable={true} editor={editor} />
              </Group>

              <CommentButton onClick={onAction} editor={editor} />

              {/* <CommentButton
            editor={editor}
            onClick={() => {
              suppressBubbleMenu.current = true;

              // Re-enable after the comment flow resolves —
              // either on next selection change or after a short delay
              const handler = () => {
                suppressBubbleMenu.current = false;
                editor.off("selectionUpdate", handler);
              };
              editor.on("selectionUpdate", handler);
            }}
          /> */}

              <MoreOptionsPopover
                type="bold"
                hideWhenUnavailable={true}
                editor={editor}
              />
            </CardItemGroup>
          </Card>
        </TiptapBubbleMenu>
      )}
    </>
  );
}
