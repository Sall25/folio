import { Editor } from "@tiptap/react";
//import { Content, Root, Trigger } from "@radix-ui/react-popover";
import { useState } from "react";
import { type StyleLabel } from "../../Shared/types";
//import { Button } from "../../../Components";
//import { Popover, PopoverContent, PopoverTrigger } from "../../../Components/popover";
import { StyleBase } from "./components/StyleBase";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "../../../Components/dropdown-menu/dropdown-menu";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import { Card } from "../../../Components/card";
import { items } from "./items";


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

    // <Button
    //   className="tiptap-button"
    // >
    //   <span>{styleLabel}</span>
    // </Button>

    <DropdownMenu>
      <DropdownMenuTrigger
        className="tiptap-button"
      >
        {styleLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <StyleBase
          editor={editor}
        >
          <Card
            style={{
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: '10px',
              minWidth: '160px',
              padding: '5px 10px'
            }}
          >
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => {
                    item.action(editor)
                  }}
                  className="tiptap-button"
                  data-highlighted={item.isActive?.(editor)}
                  style={{
                    minWidth: '100px'
                  }}
                //className={`dropdown-item ${isQuoteActive ? 'selected' : ''}`}
                >
                  <Icon
                    className="tiptap-button-icon"
                    size={16}
                  />
                  <span>{item.label}</span>

                </DropdownMenuItem>
              )
            })}
            {/* <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            //className={`dropdown-item ${isQuoteActive ? 'selected' : ''}`}
            >
              <Quote
                className="tiptap-button-icon"
                size={16}
              />
              <span>Blockquote</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            //className={`dropdown-item ${isQuoteActive ? 'selected' : ''}`}
            >
              <Quote
                className="tiptap-button-icon"
                size={16}
              />
              <span>Blockquote</span>
            </DropdownMenuItem> */}
          </Card>
        </StyleBase>
      </DropdownMenuContent>
    </DropdownMenu>


    // <Popover>
    //   <PopoverTrigger
    //   className="tiptap-button"
    //   >
    //     {styleLabel}        
    //   </PopoverTrigger>
    //   <PopoverContent>
    //     <StyleBase
    //       // onActiveChange={(label) => setStyleLabel(label)}
    //       editor={editor}
    //       >

    //       </StyleBase>

    //   </PopoverContent>
    // </Popover>
  )
}
