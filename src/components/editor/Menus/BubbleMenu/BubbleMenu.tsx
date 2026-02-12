import { Editor } from "@tiptap/react";
import { MoreOptions } from "./MoreOptions";
import { Divider } from "./Divider";
import { useState } from 'react';
import { Link } from "./Link";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import clsx from 'clsx'
import { StyleTrigger } from "./Style";
import { MarkMenu } from "./Marks";
import { ColorDropdown } from "./Color";
import { CellSelection } from "prosemirror-tables";
import { TextSelection } from "@tiptap/pm/state";
import { StyleBase } from "./Style/components/StyleBase";

export default function BubbleMenu({ editor }: { editor: Editor }) {

  const [menuVisible, setMenuVisible] = useState(false);
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
          onShow() {
            setMenuVisible(true);
          },
          onHide() {
            setMenuVisible(false)
          },

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
        <div
          className={clsx(
            'bubble-menu',
            menuVisible ? 'active' : ''
          )}
        >
          {/* Text Style */}
          <StyleTrigger
            editor={editor}
          />

          <Divider />


          {/* Marks */}
          <MarkMenu editor={editor} />

          <Divider />

          <div className='flex items-center gap-2.5 px-2.5'>
            {/*Link */}
            <Link editor={editor} />

            {/* Color */}
            <ColorDropdown editor={editor} />
          </div>

          <Divider />

          {/* More options */}
          <MoreOptions editor={editor} />

        </div>
      </TiptapBubbleMenu>
    </StyleBase>
  );
}