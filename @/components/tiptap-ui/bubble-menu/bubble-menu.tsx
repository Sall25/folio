import type { Editor } from "@tiptap/core";
import { CodeBlockButton } from "../code-block-button";
import { MarkButton } from "../mark-button";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { Card, CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { HeadingDropdownMenu } from "../heading-dropdown-menu";
import { ListDropdownMenu } from "../list-dropdown-menu";
import { BlockquoteButton } from "../blockquote-button";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tiptap-ui-primitive/popover";
import { MoreOptionsIcon } from "@/components/tiptap-icons";
import { TextAlignButton } from "../text-align-button";

import './bubble-menu.scss'
import { ColorHighlightPopover } from "../color-highlight-popover";
import { LinkPopover } from "../link-popover";

function MoreOptionsPopover({ editor }: { editor: Editor }) {

  return (
    <Popover>
      <PopoverTrigger
        className="tiptap-button"
      >
        <MoreOptionsIcon
          className="tiptap-button-icon"
        />
      </PopoverTrigger>
      <PopoverContent>
        <Card
          className="bubble-menu-content"
        >
          <CardItemGroup
            orientation="horizontal"
          >
            <MarkButton
              type="superscript"
              editor={editor}
            />
            <MarkButton
              type="subscript"
              editor={editor}
            />
            <Separator
              orientation="vertical"
            />
            <TextAlignButton
              align="left"
              editor={editor}
            />
            <TextAlignButton
              align="right"
              editor={editor}
            />
            <TextAlignButton
              align="center"
              editor={editor}
            />
            <TextAlignButton
              align="justify"
              editor={editor}
            />
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

export function BubbleMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <TiptapBubbleMenu
      editor={editor}
    >
      <Card
        className="bubble-menu-content"
      >
        <CardItemGroup orientation="horizontal">
          <HeadingDropdownMenu
            editor={editor}
          />
          <ListDropdownMenu
            editor={editor}
          />
          <BlockquoteButton
            editor={editor}
          />
          <CodeBlockButton
            editor={editor}
          />
          <Separator
            orientation="vertical"
          />
          <MarkButton
            type="bold"
            editor={editor}
          />
          <MarkButton
            type="italic"
            editor={editor}
          />
          <MarkButton
            type="strike"
            editor={editor}
          />
          <MarkButton
            type="code"
            editor={editor}
          />
          <MarkButton
            type="underline"
            editor={editor}
          />
          <Separator
            orientation="vertical"
          />
          <ColorHighlightPopover
            editor={editor}
          />
          <LinkPopover
            editor={editor}
          />
          <MoreOptionsPopover
            editor={editor}
          />

        </CardItemGroup>
      </Card>
    </TiptapBubbleMenu>
  )
}