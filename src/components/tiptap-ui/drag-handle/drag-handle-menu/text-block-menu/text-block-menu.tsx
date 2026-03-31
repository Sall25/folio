import { Editor } from "@tiptap/core";

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";

import { PaintBucket, ChevronRight, Repeat2 } from "lucide-react";

import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { ColorTextList } from "./color-text-list";
import { ColorHighlightList } from "./color-highlight-list";

export interface TextBlockMenuProps {
  editor: Editor;
  target:
    | "blockquote"
    | "codeblock"
    | "bulletList"
    | "orderedList"
    | "toc"
    | "taskList"
    | "paragraph";
}

export function TextBlockMenu(props: TextBlockMenuProps) {
  return (
    <DropdownMenuGroup className="dropdown-menu-group">
      {/* Title */}
      <DropdownMenuItem className="dropdown-menu-title">
        {props.target}
      </DropdownMenuItem>
      {/* Colors */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="dropdown-menu-sub-trigger">
          <span
            className="dropdown-menu-item"
            style={{
              background: "transparent",
            }}
          >
            <PaintBucket className="dropdown-menu-item-icon" />
            <span>Color</span>
          </span>
          <ChevronRight className="dropdown-menu-item-icon" />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <Card>
            <CardGroupLabel>Text colors</CardGroupLabel>
            <ColorTextList editor={props.editor} />
            <Separator orientation="horizontal" />
            <ColorHighlightList editor={props.editor} />
          </Card>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Turn into */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          // style={{
          //   background: 'transparent'
          // }}
          className="dropdown-menu-sub-trigger"
        >
          <span
            className="dropdown-menu-item"
            style={{
              background: "transparent",
            }}
          >
            <Repeat2 className="dropdown-menu-item-icon" />
            <span>Turn into</span>
          </span>
          <ChevronRight className="dropdown-menu-item-icon" />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>Content</DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
