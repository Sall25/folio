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
  Link
} from 'lucide-react';
import ColorDropdown from "./ColorDropdown";
import { LinkPopover } from "./LinkPopover";
import TextDropdown from "./TextDropdown";


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
  }, [editor]);


  const [linkOpen, setLinkOpen] = useState(false);


  return (
    <div className="absolute -left-full -top-12
    -translate-x-1/6 flex 
    gap-2 z-50 bg-white shadow shadow-neutral-200 
     dark:bg-neutral-900 border dark:border-neutral-800 dark:shadow-neutral-900
    rounded-full px-2 py-0.5 items-center"
    >

      {/* Text Dropdown */}
      <TextDropdown editor={editor} />

      <Divider />


      {/* Text Formatting */}
      <div className='flex items-center gap-1.5 px-2.5'>
        {/* Bold */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor?.chain().focus().toggleBold().run()}
          active={boldActive}
        >
          <Bold className="w-3.5 h-4" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor?.chain().focus().toggleItalic().run()}
          active={italicActive}
        >
          <Italic className="w-3.5 h-4" />
        </ToolbarButton>

        {/* Strike */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor?.chain().focus().toggleStrike().run()}
          active={strikeActive}
        >
          <Strikethrough className="w-3.5 h-4" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          editor={editor}
          toggleMark={(editor) => editor?.chain().focus().toggleUnderline().run()}
          active={underlineActive}
        >
          <Underline className="w-3.5 h-4" />
        </ToolbarButton>
      </div>

      <Divider />

      {/*Link */}
      <div>
        <ToolbarButton
          editor={editor}
          onClick={() => setLinkOpen(!linkOpen)}
          active={editor.isActive('link')}
        >
          <Link className="w-3.5 h-3.5" />
        </ToolbarButton>

        {linkOpen && (
          <LinkPopover
            editor={editor}
            open={linkOpen}
            onClose={() => setLinkOpen(false)}
          />
        )}
      </div>

      {/* Color */}
      <ColorDropdown editor={editor} />
      <Divider />



      {/* More options */}
      <MoreOptions editor={editor} />

    </div>
  );
}