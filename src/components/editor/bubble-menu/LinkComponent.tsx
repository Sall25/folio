import { Link } from "lucide-react"
import { Editor } from "@tiptap/react"
import ToolbarButton from "./ToolbarButton"
import { Root, Trigger, Content } from "@radix-ui/react-popover"
import { LinkPopover } from "./LinkPopover"

export function LinkComponent({ editor }: { editor: Editor }) {

  return (
    <Root>
      <Trigger>
        <ToolbarButton>
          <Link className="w-3.5 h-3.5" />
        </ToolbarButton>
      </Trigger>

      <Content side="bottom" align="center" sideOffset={6}>
        <LinkPopover
          editor={editor}
        />
      </Content>
    </Root>
  );
}