import { EditorContent, useEditor } from '@tiptap/react'
import { Placeholder, Selection } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import Link from '@tiptap/extension-link'
import HeadingWithId from '../../toc/extensions'
import { SlashCommand, MentionExtension } from '../FloatingMenu'

import BubbleMenu from '../BubbleMenu/BubbleMenu'
import Toolbar from '../../Toolbar'

function Editor() {
  const editor = useEditor({
    extensions: [

      StarterKit.configure({
        heading: false,
        undoRedo: {
          depth: 100,
          newGroupDelay: 500
        }
      }),
      Placeholder.configure({
        placeholder: 'Write Something here...',
      }),

      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
        alignments: ['left', 'right', 'center']
      }),
      FontFamily,
      TextStyle,
      FontSize,
      Color,
      BackgroundColor,
      Superscript,
      Subscript,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      HeadingWithId,
      Selection.configure({
        className: 'selection'
      }),

      MentionExtension,
      SlashCommand,
      // EmojiExtension

    ],

    editorProps: {
      attributes: {
        spellcheck: 'false',   // disable browser spell check
        autocorrect: 'off',    // optional: disables iOS autocorrect
        autocomplete: 'off',   // optional: disables autocomplete,
        class: 'tiptap'
      },
    },
  });

  if (!editor) return null;

  return (
    <main>
      <Toolbar />
      <div className="editor-container">
        <EditorContent editor={editor} />

        <BubbleMenu editor={editor} />
      </div>
    </main>
  );
}


export default Editor;
