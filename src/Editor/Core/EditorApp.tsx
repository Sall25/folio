/* tiptap extensions */
import { EditorContent, useEditor } from '@tiptap/react'
import { Placeholder, Selection } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { TextAlign } from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import Link from '@tiptap/extension-link'
import HorizontalRule from '@tiptap/extension-horizontal-rule'

// custom extensions
import {
  HeadingWithId,
  BlurSelection,
  TableMenuExtension,
  ColumnExtension,
  RowExtension,
  CustomTableCell,
  CustomTableHeader,
  DocExtension,
  CopyNodeExtension,
  DeleteNodeAtExtension,
  DuplicateNodeExtension,
  EmojiInputRules,
  TableShortcutInputRules,
  DateInputRules,
  SlashCommand,
  MentionExtension,
  EmojiExtension
} from '../Plugins/extensions'

// components
import {
  BubbleMenu,
  ColumnMenu,
  RowMenu,
  CellMenu,
  DocHandle
} from '../UI/Menus'
import {
  Toolbar
} from '../UI/Toolbar'

import { getEditorContent } from './editorContent'


export function EditorApp() {

  const editor = useEditor({
    extensions: [

      StarterKit.configure({
        heading: false,
        undoRedo: {
          depth: 100,
          newGroupDelay: 500
        },

      }),
      CopyNodeExtension,
      DuplicateNodeExtension,
      DeleteNodeAtExtension,
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
      HorizontalRule,

      // MentionExtension,
      // SlashCommand,
      TableKit.configure({
        table: false,
        tableCell: false,
        tableHeader: false
        // tableRow: false,
      }),
      TableMenuExtension.configure({
        resizable: true,
        handleWidth: 1
      }),
      CustomTableCell,
      CustomTableHeader,
      // CustomRow,
      // Selection.configure({
      //   className: 'selection'
      // }),
      BlurSelection,
      RowExtension,
      ColumnExtension,
      DocExtension,
      // EmojiInputRules,
      TableShortcutInputRules,
      DateInputRules,
      SlashCommand,
      MentionExtension,
      //  Emoji
      EmojiExtension
    ],

    editorProps: {
      attributes: {
        spellcheck: 'false',   // disable browser spell check
        autocorrect: 'off',    // optional: disables iOS autocorrect
        autocomplete: 'off',   // optional: disables autocomplete,
        class: 'tiptap',
      },
    },

    content: getEditorContent()
  });


  if (!editor) return null;

  return (
    <main>
      <Toolbar
        editor={editor}
      />
      <div className="editor-container">
        <EditorContent
          className="editor"
          editor={editor}
        />

        <BubbleMenu
          editor={editor}
        />

        <DocHandle
          editor={editor}
        />

        <ColumnMenu
          editor={editor}
        />

        <RowMenu
          editor={editor}
        />

        <CellMenu
          editor={editor}
        />

        {/* <TableFloatingMenu
          editor={editor}
        /> */}
      </div>
    </main>
  );
}
