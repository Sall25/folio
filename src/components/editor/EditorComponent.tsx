import { EditorContent, useEditor } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import Link from '@tiptap/extension-link'
import Toolbar from './Toolbar'
import BubbleMenuComponent from './bubble-menu/BubbleMenuComponent'
import { TocNavigationPanel } from './toc/types'
import HeadingWithId from './toc/extensions'

function EditorComponent() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false
      }),
      Placeholder.configure({
        placeholder: 'Write Something here...',
        emptyEditorClass: 'editor-empty',
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
    ],

    editorProps: {
      attributes: {
        spellcheck: 'false',   // disable browser spell check
        autocorrect: 'off',    // optional: disables iOS autocorrect
        autocomplete: 'off',   // optional: disables autocomplete
      }
    },
  });

  if (!editor) return null;

  return (
    <main className="rounded-2xl
     flex flex-col 
    ">
      <Toolbar />
      <TocNavigationPanel editor={editor} />

      <div className="EditorWrapper mx-auto">
        <EditorContent editor={editor} />

        <BubbleMenuComponent editor={editor} />

      </div>





    </main>


  );
}


export default EditorComponent;
