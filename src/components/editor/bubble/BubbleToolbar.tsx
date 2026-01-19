import { FaBold, FaItalic, FaStrikethrough, FaUnderline } from 'react-icons/fa';
import { Editor } from "@tiptap/react";
import FontSizeDropdown from './FontSizeDropdown';
import HeadingDropdown from './HeadingDropdown';
import FontFamilyDropdown from './FontFamilyDropdown';
import MoreOptions from './MoreOptions';
import ToolbarButton from './ToolbarButton';
import Divider from './Divider';
import { useState, useEffect } from 'react';

export default function BubbleToolbar({ editor }: { editor: Editor }) {
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

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
  }, [editor])
    ;
  return (
    <div className="flex gap-1 z-50 bg-white shadow shadow-neutral-200 
     dark:bg-neutral-800 dark:shadow-neutral-900
    rounded-full px-4 py-1"
    >

      {/*Font Family dropdrown */}
      <FontFamilyDropdown editor={editor} />

      {/*Font Heading dropdown */}
      <HeadingDropdown editor={editor} />

      <Divider />

      {/* Text Size dropdwon */}
      <FontSizeDropdown editor={editor} />

      <Divider />

      {/* Text Style */}
      <div className='flex gap-1.5 px-2.5'>
        {/* Bold */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor.chain().focus().toggleBold().run()}
          active={boldActive}
        >
          <FaBold className="" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor.chain().focus().toggleItalic().run()}
          active={italicActive}
        >
          <FaItalic />
        </ToolbarButton>

        {/* Strike */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor.chain().focus().toggleStrike().run()}
          active={strikeActive}
        >
          <FaStrikethrough className="" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor.chain().focus().toggleUnderline().run()}
          active={underlineActive}
        >
          <FaUnderline />
        </ToolbarButton>

      </div>

      <Divider />

      {/* More options */}
      <MoreOptions editor={editor} />

    </div>
  );
}