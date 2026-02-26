import { Link as LinkIcon } from "lucide-react"
import { Editor } from "@tiptap/react"
import { Root, Trigger, Content } from "@radix-ui/react-popover"
import { LinkPopover } from "./LinkPopover"

export function Link({ editor }: { editor: Editor }) {

  return (
    <Root>
      <Trigger className="tiptap-button">
        <LinkIcon
          className="tiptap-button-icon"
        />
      </Trigger>

      <Content
        side="bottom"
        align="center"
        sideOffset={6}

      >
        <LinkPopover
          editor={editor}
        />
      </Content>
    </Root>
  );
}