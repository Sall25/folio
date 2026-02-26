import { Editor } from "@tiptap/react";
import ColorComponentBase from "./ColorComponentBase";
import { ColorPalette } from "./ColorPalette";
import { HighlightPalette } from "./HighlightPalette";
import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ButtonGroup } from "../../../../Components";
import { Card, CardBody, CardItemGroup } from "../../../../Components/card";
import { useIsBreakpoint } from "../../../../Components/hooks/use-is-breakpoint";
import { Separator } from "../../../../Components/separator";

export function ColorDropdown({ editor }: { editor: Editor }) {

  const [menuVisible, setMenuVisible] = useState(false)
  const isMobile = useIsBreakpoint()

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
        <Trigger
          className="tiptap-button"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ButtonGroup
            orientation="horizontal"
          >
            <span> A</span>
            <ChevronDown
              className="tiptap-button-dropdown-arrows"
            />
          </ButtonGroup>
        </Trigger>

        <Content
          sideOffset={8}

          onMouseDown={(e) => e.preventDefault()}
          style={{
            outline: 'none'
          }}
        >
          <Card
            style={isMobile ? { boxShadow: "none", border: 0 } : {}}

          >
            <CardBody>
              <CardItemGroup
                orientation="vertical"
              >
                <ColorPalette />
                <Separator
                  orientation="horizontal"
                />
                <HighlightPalette />
              </CardItemGroup>
            </CardBody>
          </Card>
        </Content>
      </Root>
    </ColorComponentBase>

  );
}
