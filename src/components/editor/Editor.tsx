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
import HeadingWithId from './Navigation/toc/extensions'
//import { SlashCommand, MentionExtension, GutterFloatingMenu } from './Menus/FloatingMenu'

import BubbleMenu from './Menus/BubbleMenu/BubbleMenu'
import Toolbar from './Toolbar/Toolbar'
//import { GutterMenuExtension, TextBlockStyle } from './Menus/FloatingMenu/components/GutterFloatingMenu/extensions'
import { BlurSelection } from './Menus/BubbleMenu/extensions'
//import { TableFloatingMenu } from './Menus/FloatingMenu/components/Table'
import { CopyNodeExtension, DeleteNodeAt, DuplicateNodeExtension } from './extensions'
import { getEditorContent } from './editorContent'
import { ColumnMenu } from './Menus/FloatingMenu/components/Table/ColumnMenu'
import { RowMenuComp } from './Menus/FloatingMenu/components/Table/RowMenu'
import { CustomTableCell, CustomTableHeader } from './Menus/FloatingMenu/components/Table/CellMenu/extensions'
import { TableMenuExtension } from './Menus/FloatingMenu/components/Table/TableMenu/extensions/TableExtension'
import { RowExtension } from './Menus/FloatingMenu/components/Table/RowMenu/extensions'
import { ColumnExtension } from './Menus/FloatingMenu/components/Table/ColumnMenu/extensions'
import { CellMenu } from './Menus/FloatingMenu/components/Table/CellMenu/CellMenu'
import { DocHandle } from './Menus/FloatingMenu/components/DocHandle'
import { DocExtension } from './Menus/FloatingMenu/components/DocHandle/extensions'
import HorizontalRule from '@tiptap/extension-horizontal-rule'

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
      CopyNodeExtension,
      DuplicateNodeExtension,
      DeleteNodeAt,
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
      DocExtension
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

        <RowMenuComp
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

export default Editor;
