import { Link as LinkIcon } from "lucide-react"
import { Editor } from "@tiptap/react"
//import { Root, Trigger, Content } from "@radix-ui/react-popover"
import { LinkPopover } from "./LinkPopover"
import { Popover, PopoverContent, PopoverTrigger } from "../../../Components/popover";

export function Link({ editor }: { editor: Editor }) {

  return (
    // <Root>
    //   <Trigger className="tiptap-button">
    //     <LinkIcon
    //       className="tiptap-button-icon"
    //     />
    //   </Trigger>

    //   <Content
    //     side="bottom"
    //     align="center"
    //     sideOffset={6}

    //   >
    //     <LinkPopover
    //       editor={editor}
    //     />
    //   </Content>
    // </Root>
    <Popover>
      <PopoverTrigger
        className="tiptap-button"
      >
        <LinkIcon
          className="tiptap-button-icon"
        />
      </PopoverTrigger>
      <PopoverContent>
        <LinkPopover
          editor={editor}
        />
      </PopoverContent>
    </Popover>
  );
}