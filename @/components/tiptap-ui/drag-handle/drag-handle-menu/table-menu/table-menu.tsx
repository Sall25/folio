import { AlignmentIcon } from "@/components/tiptap-icons/alignment-icon";
import { ColorIcon } from "@/components/tiptap-icons/color-icon";
import { FitToWidthIcon } from "@/components/tiptap-icons/fit-to-width-icon";
import {
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem
} from "@/components/tiptap-ui-primitive/dropdown-menu";
import type { Editor } from "@tiptap/core";
import { ChevronRight } from "lucide-react";


export interface TableMenuProps {
  editor: Editor
}

export function TableMenu(props: TableMenuProps) {
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
