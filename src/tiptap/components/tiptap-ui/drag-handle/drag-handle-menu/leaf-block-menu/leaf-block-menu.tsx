import { Editor } from "@tiptap/core"
import {
  DropdownMenuGroup,
  DropdownMenuItem
} from "@/components/tiptap-ui-primitive/dropdown-menu"
import { Download } from "lucide-react"

export interface LeafBlockMenuProps {
  editor: Editor
  target: 'image' | 'hr'
}
export function LeafBlockMenu(props: LeafBlockMenuProps) {
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
