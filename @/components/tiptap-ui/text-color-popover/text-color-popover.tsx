
import type { Editor } from "@tiptap/core";

import { COLORS } from './data/colors'
import { Card, CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tiptap-ui-primitive/popover";
import { TextColorIcon } from "@/components/tiptap-icons";
import { TextColorButton } from "../text-color-button";

function ColorPopoverContent({ editor }: { editor: Editor }) {
  return (

    <Card
      style={{
        gap: '5px',
        padding: '5px 10px'
      }}
    >
      <CardItemGroup
        orientation="horizontal"
      >
        {COLORS.slice(0, 5).map((color) => (
          <TextColorButton
            key={color.css}
            editor={editor}
            textColor={color.css}
            onClick={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleTextStyle({ color: color.css }).run();
            }}
          >
            A
          </TextColorButton>
        ))}

      </CardItemGroup>

      <CardItemGroup orientation="horizontal">
        {COLORS.slice(5, 10).map((color) => (

          <TextColorButton
            key={color.css}
            editor={editor}
            textColor={color.css}
            onClick={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleTextStyle({ color: color.css }).run();
            }}
          >
            A
          </TextColorButton>
        ))}
      </CardItemGroup>

    </Card>
  );
}

export function TextColorPopover({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-appearance="default"
          role="button"
          tabIndex={-1}
          aria-label="Color text"
          tooltip="Color"

        >
          <TextColorIcon className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <ColorPopoverContent
          editor={editor}
        />
      </PopoverContent>
    </Popover>
  )
}