import { Editor } from "@tiptap/react";
import ColorComponentBase from "./ColorComponentBase";
import { ColorPalette } from "./ColorPalette";
import { HighlightPalette } from "./HighlightPalette";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { Separator } from "./Separator";

export function ColorDropdown({ editor }: { editor: Editor }) {
  return (
    <ColorComponentBase editor={editor}>
      <Root>
        <Trigger className="bubble-button" asChild>
          <span
            className=""
            onMouseDown={(e) => e.preventDefault()}
          >
            <span> A</span>
            <ChevronDown className="icon" />
          </span>
        </Trigger>

        <Content
          sideOffset={8}
          className="dropdown-menu active"
        >
          <ColorPalette />
          <Separator />
          <HighlightPalette />
        </Content>
      </Root>
    </ColorComponentBase>
  );
}
