import { Editor } from "@tiptap/react";
import { MoreOptions } from "./MoreOptions";
import { Divider } from "./Divider";
import { useState } from 'react';
import { Link } from "./Link";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import clsx from 'clsx'
import { StyleDropdown } from "./Style";
import { MarkMenu } from "./Marks";
import { ColorDropdown } from "./Color";

export default function BubbleMenu({ editor }: { editor: Editor }) {

  const [menuVisible, setMenuVisible] = useState(false);

  return (

    <TiptapBubbleMenu
      editor={editor}
      className="z-50"
      options={{
        placement: 'top',
        flip: true, offset: 8,

        strategy: 'fixed',
        onShow() {
          setMenuVisible(true);
          console.log('visible')
        },
        onHide() {
          setMenuVisible(false)
        },

      }}
    >
      <div
        className={clsx(
          'bubble-menu',
          menuVisible ? 'active' : ''
        )}
      >
        {/* Text Style */}
        <StyleDropdown editor={editor} />

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
  );
}