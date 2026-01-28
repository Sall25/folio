import { Link as LinkIcon } from "lucide-react"
import { Editor } from "@tiptap/react"
import BubbleButton from "./BubbleButton"
import { Root, Trigger, Content } from "@radix-ui/react-popover"
import { LinkPopover } from "./LinkPopover"

export function Link({ editor }: { editor: Editor }) {

  return (
    <Root>
      <Trigger>
        <BubbleButton>
          <LinkIcon className="w-3.5 h-3.5" />
        </BubbleButton>
      </Trigger>

      <Content side="bottom" align="center" sideOffset={6}>
        <LinkPopover
          editor={editor}
        />
      </Content>
    </Root>
  );
}