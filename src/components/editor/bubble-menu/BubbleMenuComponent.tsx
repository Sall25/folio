import { Editor, useEditorState } from "@tiptap/react";
import MoreOptions from './MoreOptions';
import Divider from './Divider';
import { useState } from 'react';
import {
  Bold,
  Code,
  Italic,
  Strikethrough,
  Underline,
} from 'lucide-react';
import TextDropdown from "./TextDropdown";
import ColorDropdown from "./ColorDropdown";
import { LinkComponent } from "./LinkComponent";
import { BubbleMenu } from "@tiptap/react/menus";
import clsx from 'clsx'
import Button from "./Button";


export default function BubbleMenuComponent({ editor }: { editor: Editor }) {


  const [menuVisible, setMenuVisible] = useState(false);

  const {
    canBold,
    canItalic,
    canStrike,
    canUnderline,
    canCode,
    isBold,
    isItalic,
    isStrike,
    isUnderline,
    isCode,
  } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canBold: editor.can().toggleBold(),
      canItalic: editor.can().toggleItalic(),
      canStrike: editor.can().toggleStrike(),
      canUnderline: editor.can().toggleUnderline(),
      canCode: editor.can().toggleCode(),

      isBold: editor.isActive('bold'),
      isItalic: editor.isActive('italic'),
      isStrike: editor.isActive('strike'),
      isUnderline: editor.isActive('underline'),
      isCode: editor.isActive('code'),
    }),
  })


  return (

    <BubbleMenu
      editor={editor}
      className="z-50"
      options={{
        placement: 'top',
        strategy: 'absolute',
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
          'flex gap-2 z-50 bg-white ring-1 ring-neutral-100 dark:ring-neutral-800 dark:bg-neutral-900 shadow rounded-2xl px-4 py-0.5 h-10 items-center transition-all duration-150 ease-out',
          menuVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Text Dropdown */}
        <TextDropdown editor={editor} />

        <Divider />


        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Button
            active={isBold}
            disabled={!canBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-4 h-5 font-bold" />
          </Button>

          <Button
            active={isItalic}
            disabled={!canItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-4 h-5" />
          </Button>

          <Button
            active={isStrike}
            disabled={!canStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="w-4 h-5" />
          </Button>

          <Button
            active={isUnderline}
            disabled={!canUnderline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="w-4 h-5" />
          </Button>

          <Button
            active={isCode}
            disabled={!canCode}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="w-4 h-5" />
          </Button>
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
  );
}