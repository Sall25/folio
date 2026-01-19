import { Editor, EditorContent, useEditor } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Toolbar from './Toolbar'
import { NavigationPanel } from './navigation'
import { BubbleMenu } from '@tiptap/react/menus'
import BubbleToolbar from './bubble/BubbleToolbar'

function EditorLayout({ editor }: { editor: Editor }) {
  return (
    <div className="">
      <EditorContent editor={editor} />
    </div>
  );
}

function EditorComponent() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write Something here...',
        emptyEditorClass: 'editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'right', 'center']
      }),
      FontFamily,
      TextStyle,
      FontSize,
      Color,
      BackgroundColor,
      HorizontalRule

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
    <main className=' mt-7 sm:w-xl md:w-2xl lg:w-4xl mx-auto 
        font-sans rounded-2xl w-40
        '>
      <Toolbar />
      <div className='EditorWrapper'>
        <EditorLayout editor={editor} />
      </div>

      <BubbleMenu className='z-50' editor={editor} options={{ placement: 'top', offset: 8, flip: true }}>
        <BubbleToolbar editor={editor} />
      </BubbleMenu>

      <NavigationPanel editor={editor} />
    </main>

  );
}


export default EditorComponent;
