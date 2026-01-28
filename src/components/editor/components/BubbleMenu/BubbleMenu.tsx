import { Editor } from "@tiptap/react";
import MoreOptions from './MoreOptions';
import ToolbarButton from './BubbleButton';
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
import { Link } from "./Link";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import clsx from 'clsx'
import './BubbleMenu.scss'

export default function BubbleMenu({ editor }: { editor: Editor }) {
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);


  useEffect(() => {
    if (!editor) return;

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

    update();

    return () => {
      editor.off('update', update);
    }
  }, [editor]);


  return (

    <TiptapBubbleMenu
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
      <div
        className={clsx(
          'bubble-menu transition-all duration-150 ease-out',
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