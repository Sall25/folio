import { LinkIcon } from "@/components/tiptap-icons";
import { AlignmentIcon } from "@/components/tiptap-icons/alignment-icon";
//import { ClearAllContentIcon } from "@/components/tiptap-icons/clear-all-content-icon";
import { ClipboardCopyIcon } from "@/components/tiptap-icons/clipboard-copy-icon";
import { ColorIcon } from "@/components/tiptap-icons/color-icon";
import { DownloadImageIcon } from "@/components/tiptap-icons/download-image-icon";
import { DuplicateIcon } from "@/components/tiptap-icons/duplicate-icon";
import { FitToWidthIcon } from "@/components/tiptap-icons/fit-to-width-icon";
import { TurnIntoIcon } from "@/components/tiptap-icons/turn-into-icon";
import { Card, CardGroupLabel } from "@/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem
} from "@/components/tiptap-ui-primitive/dropdown-menu";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import type { Editor } from "@tiptap/core";
import { ChevronRight, Circle, ClipboardCopy, Copy, Download, Trash } from "lucide-react";

import './drag-handle-menu-colors.scss'
import './drag-handle-menu.scss'
//import { ClearAllContentIcon } from "@/components/tiptap-icons/clear-all-content-icon";
//import { Button } from "@/components/tiptap-ui-primitive/button";

interface TextBlockMenuProps {
  editor: Editor
  target: 'blockquote' | 'codeblock' | 'bulletList' | 'orderedList' | 'toc' | 'taskList' | 'paragraph'
}
function TextBlockMenu(props: TextBlockMenuProps) {
  return (

    <DropdownMenuGroup
      className="dropdown-menu-group"
    >
      {/* Title */}
      <DropdownMenuItem
        className="dropdown-menu-title"
      >
        {props.target}
      </DropdownMenuItem>
      {/* Colors */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className="dropdown-menu-sub-trigger"
        >
          <span
            className="dropdown-menu-item"
            style={{
              background: 'transparent'
            }}
          >
            <ColorIcon
              className="dropdown-menu-item-icon"
            />
            <span>Color</span>
          </span>
          <ChevronRight
            className="dropdown-menu-item-icon"
          />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          Colors
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
              background: 'transparent'
            }}
          >
            <Circle
              className="dropdown-menu-item-icon"
            />
            <span>Turn into</span>
          </span>
          <ChevronRight
            className="dropdown-menu-item-icon"
          />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          Content
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  )
}

interface TableMenuProps {
  editor: Editor
}
function TableMenu(props: TableMenuProps) {
  return (
    <DropdownMenuGroup
    >
      {/* Title */}
      <DropdownMenuItem
        className="dropdown-menu-title"
      >
        <span> table</span>
      </DropdownMenuItem>

      {/* Colors */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <ColorIcon />
          <span>Color</span>
          <ChevronRight />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          Colors
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Alignment  */}
      <DropdownMenuSub>
        <DropdownMenuTrigger>
          <AlignmentIcon />
          <span>Alignment</span>
          <ChevronRight />
        </DropdownMenuTrigger>
        <DropdownMenuSubContent>
          Content
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Fit to width */}
      <DropdownMenuItem>
        <FitToWidthIcon />
        <span>Fit to width</span>
      </DropdownMenuItem>

      {/*Clear all contents */}
      <DropdownMenuItem>
        {/* <ClearAllContentIcon /> */}
        <span>Clear all contents</span>
      </DropdownMenuItem>
    </DropdownMenuGroup>

  )
}

interface LeafBlockMenuProps {
  editor: Editor
  target: 'image' | 'hr'
}
function LeafBlockMenu(props: LeafBlockMenuProps) {
  if (props.target === 'image') {
    return (
      <DropdownMenuGroup
        className="dropdown-menu-group"
      >
        <DropdownMenuItem
          className="dropdown-menu-title"
        >

          {props.target}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="dropdown-menu-item"
        >
          <Download
            className="dropdown-menu-item-icon"
          />
          <span>Download image</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    )
  } else if (props.target === 'hr') {
    return (
      <DropdownMenuGroup>
        <DropdownMenuItem>
          horizontal rule
        </DropdownMenuItem>
      </DropdownMenuGroup>
    )
  }
  return null
}

function CommonBlockActions({ editor }: { editor: Editor }) {
  return (
    <DropdownMenuGroup
      className="dropdown-menu-group"
    >
      <DropdownMenuItem
        className="dropdown-menu-item"
      >
        <Copy
          className="dropdown-menu-item-icon"
        />
        <span>Duplicate node</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        className="dropdown-menu-item"
      >
        <ClipboardCopy
          className="dropdown-menu-item-icon"
        />
        <span>Copy to clipboard</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        className="dropdown-menu-item"
      >
        <LinkIcon
          className="dropdown-menu-item-icon"
        />
        <span>Copy anchor link</span>
      </DropdownMenuItem>

      <Separator
        orientation="horizontal"
        style={{
          padding: '0',
          margin: '0'
        }}
      />
      <DropdownMenuItem
        className="dropdown-menu-item"
      >
        <Trash
          className="dropdown-menu-item-icon"
        />
        <span>Delete</span>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

export type DragHandleTarget = TextBlockMenuProps['target'] | LeafBlockMenuProps['target'] | 'table'
interface DragHandleMenuProps {
  editor: Editor
  target: DragHandleTarget
}

export function DragHandleMenu(props: DragHandleMenuProps) {
  const { target, editor } = props

  const isTextBlock = [
    'blockquote',
    'codeblock',
    'bulletList',
    'orderedList',
    'toc',
    'taskList',
    'paragraph'
  ].includes(target)

  const isLeafBlock = ['image', 'hr'].includes(target)

  return (
    <DropdownMenuContent
      align="start"
      side="left"
    >
      <Card
        className="dropdown-menu-content"
      >
        {isTextBlock && (
          <TextBlockMenu
            editor={editor}
            target={target as TextBlockMenuProps['target']}
          />
        )}
        {isLeafBlock && (
          <LeafBlockMenu
            editor={editor}
            target={target as LeafBlockMenuProps['target']}
          />
        )}
        {target === 'table' && (
          <TableMenu
            editor={editor}
          />
        )}
        <Separator
          orientation="horizontal"
        />
        <CommonBlockActions
          editor={editor}
        />
      </Card>
    </DropdownMenuContent>
  )
}

