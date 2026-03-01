import { Editor } from "@tiptap/react";
import ColorComponentBase from "./ColorComponentBase";
import { ColorPalette } from "./ColorPalette";
import { HighlightPalette } from "./HighlightPalette";
import { ChevronDown } from "lucide-react";
import { ButtonGroup } from "../../../../Components";
import { Card, CardBody, CardItemGroup } from "../../../../Components/card";
import { useIsBreakpoint } from "../../../../Components/hooks/use-is-breakpoint";
import { Separator } from "../../../../Components/separator";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../Components/popover";

export function ColorDropdown({ editor }: { editor: Editor }) {

  const isMobile = useIsBreakpoint()

  return (
    <ColorComponentBase editor={editor}>
      <Popover>
        <PopoverTrigger
          className="tiptap-button"
        >
          <ButtonGroup
            orientation="horizontal"
          >
            <span> A</span>
            <ChevronDown
              className="tiptap-button-dropdown-arrows"
            />
          </ButtonGroup>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
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

        </PopoverContent>
      </Popover>
    </ColorComponentBase>

  );
}
