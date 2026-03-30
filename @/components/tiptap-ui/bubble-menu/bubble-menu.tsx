import type { Editor } from "@tiptap/core";
import { CodeBlockButton } from "../code-block-button";
import { MarkButton, useMark, type UseMarkConfig } from "../mark-button";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { Card, CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { HeadingDropdownMenu } from "../heading-dropdown-menu";
import { BlockquoteButton } from "../blockquote-button";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover";
import { MoreOptionsIcon } from "@/components/tiptap-icons";
import { TextAlignButton } from "../text-align-button";

import "./bubble-menu.scss";
import { ColorHighlightPopover } from "../color-highlight-popover";
import { LinkPopover } from "../link-popover";
import { ColorTextPopover } from "../color-text-popover";
import {
  Button,
  type ButtonProps,
} from "@/components/tiptap-ui-primitive/button";
import { CommentButton } from "@/components/tiptap-ui/comment-button";
import CaptionButton from "@/components/tiptap-ui/caption-button";
import { useEffect, useRef, useState } from "react";
import { ImageAlignButton } from "../image-align-button/image-align-button";
import { NodeSelection } from "@tiptap/pm/state";
import { CommentPopover } from "../comment-popover";

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
  const suppressBubbleMenu = useRef(false);
  const [isNodeSelection, setIsNodeSelection] = useState(false);

  if (!editor) return null;

  return (
    <TiptapBubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        if (suppressBubbleMenu.current) {
          return false;
        }

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
            <HeadingDropdownMenu hideWhenUnavailable={true} editor={editor} />
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
            <ColorHighlightPopover hideWhenUnavailable={true} editor={editor} />
            <ColorTextPopover hideWhenUnavailable={true} editor={editor} />
            <LinkPopover hideWhenUnavailable={true} editor={editor} />
          </Group>

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
          <CommentPopover editor={editor} />

          <MoreOptionsPopover
            type="bold"
            hideWhenUnavailable={true}
            editor={editor}
          />
        </CardItemGroup>
      </Card>
    </TiptapBubbleMenu>
  );
}
