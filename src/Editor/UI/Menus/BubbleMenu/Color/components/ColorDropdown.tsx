import { Editor } from "@tiptap/react";
import ColorComponentBase from "./ColorComponentBase";
import { ColorPalette } from "./ColorPalette";
import { HighlightPalette } from "./HighlightPalette";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

export function ColorDropdown({ editor }: { editor: Editor }) {

  const [menuVisible, setMenuVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMenuVisible(true)
    })

    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <ColorComponentBase editor={editor}>
      <Root
        onOpenChange={(open) => {
          if (!open) {
            editor.view.focus()
          }
        }}
      >
        <Trigger className="bubble-button" onMouseDown={(e) => e.preventDefault()}>
          <span
            className=""
          >
            <span> A</span>
            <ChevronDown className="icon" />
          </span>
        </Trigger>

        <Content
          sideOffset={8}
          className={clsx('dropdown-menu', { active: menuVisible })}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="dropdown-scroll">
            <ColorPalette />
            <hr className="dropdown-divider" />
            <HighlightPalette />
          </div>
        </Content>
      </Root>
    </ColorComponentBase>
  );
}
