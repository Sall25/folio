import { Editor } from "@tiptap/react";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { ColorMenu, StyleMenu } from "../../Shared";
import { useState } from "react";
import { type RecentType, type StyleLabel } from "../../Shared/types";


export function StyleTrigger({ editor }: { editor: Editor }) {

  const [styleLabel, setStyleLabel] = useState<StyleLabel>('Text')
  const [recent, setRecent] = useState<RecentType>({ text: [], highlight: [] })


  return (
    <Root
      onOpenChange={(open) => {
        if (!open) {
          editor.view.focus()
          
        }
      }}
    >
      <Trigger className="bubble-trigger">
        <span>{styleLabel}</span>
      </Trigger>
      <Content
        side="bottom"
        className="dropdown-menu active"
      >
        {/* <StyleMenu
          onActiveChange={(label) => setStyleLabel(label)}
          editor={editor}
        /> */}
        <div className="dropdown-scroll">
          <ColorMenu
            editor={editor}
            recent={recent}
            setRecent={setRecent}
          />
        </div>

      </Content>
    </Root>
  )
}
