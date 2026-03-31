import { Editor } from "@tiptap/core";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Copy, Trash, ClipboardCopy } from "lucide-react";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { LinkIcon } from "src/components/tiptap-icons";

export function CommonBlockActions({ editor }: { editor: Editor }) {
  return (
    <DropdownMenuGroup className="dropdown-menu-group">
      <DropdownMenuItem className="dropdown-menu-item">
        <Copy className="dropdown-menu-item-icon" />
        <span>Duplicate node</span>
      </DropdownMenuItem>

      <DropdownMenuItem className="dropdown-menu-item">
        <ClipboardCopy className="dropdown-menu-item-icon" />
        <span>Copy to clipboard</span>
      </DropdownMenuItem>

      <DropdownMenuItem className="dropdown-menu-item">
        <LinkIcon className="dropdown-menu-item-icon" />
        <span>Copy anchor link</span>
      </DropdownMenuItem>

      <Separator
        orientation="horizontal"
        style={{
          padding: "0",
          margin: "0",
        }}
      />
      <DropdownMenuItem className="dropdown-menu-item">
        <Trash className="dropdown-menu-item-icon" />
        <span>Delete</span>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
