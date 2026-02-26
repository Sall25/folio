import { Editor } from "@tiptap/react";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { useState } from "react";
import { type StyleLabel } from "../../Shared/types";
import { Button } from "../../../Components";


export function StyleTrigger({ editor }: { editor: Editor }) {

  const [styleLabel,] = useState<StyleLabel>('Text')


  return (
    // <Root
    //   onOpenChange={(open) => {
    //     if (!open) {
    //       editor.view.focus()

    //     }
    //   }}
    // >
    //   <Trigger className="bubble-trigger">
    //     <span>{styleLabel}</span>
    //   </Trigger>
    //   <Content
    //     side="bottom"
    //     className="dropdown-menu active"
    //   >
    //     {/* <StyleMenu
    //       onActiveChange={(label) => setStyleLabel(label)}
    //       editor={editor}
    //     /> */}
    //     <div className="dropdown-scroll">
    //       <span>Content</span>
    //     </div>

    //   </Content>
    // </Root>

    <Button
      className="tiptap-button"
    >
      <span>{styleLabel}</span>
    </Button>
  )
}
