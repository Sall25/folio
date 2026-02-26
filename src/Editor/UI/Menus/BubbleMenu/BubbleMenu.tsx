import { Editor } from "@tiptap/react";
import { MoreOptions } from "./MoreOptions";
import { Divider } from "./Divider";
import { Link } from "./Link";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import { StyleTrigger } from "./Style";
import { MarkMenu } from "./Marks";
import { CellSelection } from "prosemirror-tables";
import { TextSelection } from "@tiptap/pm/state";
import { StyleBase } from "./Style/components/StyleBase";
import { ButtonGroup } from "../../Components";
import { Card } from "../../Components/card";
import { ColorDropdown } from "./Color";

export default function BubbleMenu({ editor }: { editor: Editor }) {

  //const [isVisible, setIsVisible] = useState(true)

  return (

    <StyleBase
      editor={editor}
    >
      <TiptapBubbleMenu
        editor={editor}
        className="z-50"
        options={{
          placement: 'top',
          flip: true, offset: 8,

          strategy: 'fixed',

        }}
        shouldShow={({ state }) => {
          const { selection } = state

          // hide for table selections
          if (selection instanceof CellSelection) return false

          // hide for node selections
          if (selection.constructor.name === "NodeSelection") return false

          // only show for real text selection
          if (!(selection instanceof TextSelection)) return false

          // ignore cursor-only selections
          if (selection.empty) {
            return false
          }

          return true
        }}
      >

        <Card
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '5px',
            padding: '3px 10px',

          }}

        >
          {/* Text Style */}
          <StyleTrigger
            editor={editor}
          />

          <Divider />


          {/* Marks */}
          <MarkMenu editor={editor} />

          <Divider />


          <ButtonGroup
            orientation="horizontal"
            style={{
              gap: '10px'
            }}
          >
            {/*Link */}
            <Link editor={editor} />

            {/* Color */}
            {/* <Root
              open={open}
              onOpenChange={setOpen}
            >
              <Trigger asChild>
                <ColorHighlightButton
                  editor={editor}
                // onMouseDown={(e) => {
                //   e.preventDefault()
                //   setOpen(!open)
                // }}
                >
                  <Icon
                    className="tiptap-button-icon"
                  />
                </ColorHighlightButton>
              </Trigger>
              <Portal>
                <Content>
                  <ColorHighlightPopoverContent editor={editor} />
                </Content>
              </Portal>
            </Root> */}


            <ColorDropdown
              editor={editor}
            />
          </ButtonGroup>

          <Divider />

          {/* More options */}
          <MoreOptions editor={editor} />

        </Card>

        {/* <ButtonGroup
          orientation="horizontal"
        >
         
        </ButtonGroup> */}
      </TiptapBubbleMenu>
    </StyleBase>
  );
}