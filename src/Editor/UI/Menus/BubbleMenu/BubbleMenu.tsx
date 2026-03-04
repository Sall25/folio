import { Editor } from "@tiptap/react";
import { MoreOptions } from "./MoreOptions";
import { Divider } from "./Divider";
import { Link } from "./Link";
import { StyleTrigger } from "./Style";
import { MarkMenu } from "./Marks";
import { StyleBase } from "./Style/components/StyleBase";
import { Button, ButtonGroup } from "../../Components";
import { Card } from "../../Components/card";
import { ColorDropdown } from "./Color";
import { MessageSquare } from "lucide-react";
import { BubbleMenuComp } from "./BubbleMenuComp";

export default function BubbleMenu({ editor }: { editor: Editor }) {

  //const [isVisible, setIsVisible] = useState(true)

  return (

    <StyleBase
      editor={editor}
    >
      <BubbleMenuComp
        editor={editor}
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

          {/* Comment */}
          <Button
            onClick={() => {
              editor.commands.addComment('You')
            }}
          >
            <MessageSquare className='tiptap-button-icon' />
          </Button>

          {/* More options */}
          <MoreOptions editor={editor} />

        </Card>

        {/* <ButtonGroup
          orientation="horizontal"
        >
         
        </ButtonGroup> */}
      </BubbleMenuComp>
    </StyleBase>
  );
}