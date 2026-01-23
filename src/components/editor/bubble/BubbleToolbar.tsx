import { Editor } from "@tiptap/react";
import MoreOptions from './MoreOptions';
import ToolbarButton from './ToolbarButton';
import Divider from './Divider';
import { useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
} from 'lucide-react';
import TextDropdown from "./TextDropdown";
import ColorDropdown from "./ColorDropdown";
import { LinkComponent } from "./LinkComponent";
import { BubbleMenu } from "@tiptap/react/menus";
import clsx from 'clsx'


export default function BubbleToolbar({ editor }: { editor: Editor }) {
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);


  useEffect(() => {
    if (!editor) return;

    //   const node = $from.parent;

    //   // Show BubbleMenu only for these block types
    //   const allowedBlocks = ['paragraph', 'heading', 'listItem'];
    //   if (allowedBlocks.includes(node.type.name)) {
    //     setMenuVisible(true);
    //   } else {
    //     setMenuVisible(false);
    //   }
    // };

    const update = () => {
      const bold = editor.isActive('bold');
      setBoldActive(bold);

      const italic = editor.isActive('italic');
      setItalicActive(italic);

      const strike = editor.isActive('strike');
      setStrikeActive(strike);

      const underline = editor.isActive('underline');
      setUnderlineActive(underline);


    };

    editor.on('update', update);
    // editor.on('selectionUpdate', updateMenuVisibility);

    update();

    return () => {
      editor.off('update', update);
      // editor.off('selectionUpdate', updateMenuVisibility);
    }
  }, [editor]);


  return (

    <BubbleMenu
      editor={editor}
      className="z-50"
      options={{
        placement: 'top-start',
        flip: true, offset: 8,
        onShow() {
          setMenuVisible(true)
        },
        onHide() {
          setMenuVisible(false)
        },

      }}
    >
      {/*absolute -left-full -top-12 -translate-x-1/6 */}
      <div
        className={clsx(
          'flex gap-2 z-50 bg-white ring-1 dark:ring-neutral-800 dark:bg-neutral-900 shadow rounded-2xl px-4 py-0.5 h-10 items-center transition-all duration-150 ease-out',
          menuVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Text Dropdown */}
        <TextDropdown editor={editor} />

        <Divider />


        {/* Text Formatting */}
        <div className='flex items-center gap-2.5 px-2.5'>
          {/* Bold */}
          <ToolbarButton
            editor={editor}
            toggleMark={(editor) => editor?.chain().focus().toggleBold().run()}
            active={boldActive}
          >
            <Bold />
          </ToolbarButton>

          {/* Italic */}
          <ToolbarButton
            editor={editor}
            toggleMark={(editor) => editor?.chain().focus().toggleItalic().run()}
            active={italicActive}
          >
            <Italic />
          </ToolbarButton>

          {/* Strike */}
          <ToolbarButton
            editor={editor}
            toggleMark={(editor) => editor?.chain().focus().toggleStrike().run()}
            active={strikeActive}
          >
            <Strikethrough />
          </ToolbarButton>

          {/* Underline */}
          <ToolbarButton
            editor={editor}
            toggleMark={(editor) => editor?.chain().focus().toggleUnderline().run()}
            active={underlineActive}
          >
            <Underline />
          </ToolbarButton>
        </div>

        <Divider />

        <div className='flex items-center gap-2.5 px-2.5'>
          {/*Link */}
          <LinkComponent editor={editor} />

          {/* Color */}
          <ColorDropdown editor={editor} />
        </div>

        <Divider />

        {/* More options */}
        <MoreOptions editor={editor} />

      </div>
    </BubbleMenu>

    // // </div>
    // <div className="z-50">
    //   <Root open={open}>
    //     <Content className="flex 
    //  gap-2 z-50 bg-white shadow shadow-neutral-200 
    //   dark:bg-neutral-900 border dark:border-neutral-800 dark:shadow-neutral-900
    //  rounded-full px-2 py-0.5 items-center">

    //     </Content>
    //   </Root>
    // </div>
  );
}