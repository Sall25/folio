import { EditorContent, findParentNodeClosestToPos, useEditor, useEditorState } from '@tiptap/react'
import { Placeholder, Selection } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { TextAlign } from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import Link from '@tiptap/extension-link'
import HeadingWithId from '../../toc/extensions'
import { SlashCommand, MentionExtension, GutterFloatingMenu } from '../FloatingMenu'

import BubbleMenu from '../BubbleMenu/BubbleMenu'
import Toolbar from '../../Toolbar'
import { TableFloatingMenu } from '../FloatingMenu/components/Table'

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
      TableKit.configure({
        table: { resizable: true }
      })
    ],

    editorProps: {
      attributes: {
        spellcheck: 'false',   // disable browser spell check
        autocorrect: 'off',    // optional: disables iOS autocorrect
        autocomplete: 'off',   // optional: disables autocomplete,
        class: 'tiptap',
      },
    },

    content: `
           <table>
      <caption>
        Formation développeur·euse front-end 2021
      </caption>
      <thead>
        <tr>
          <th scope="col">Nom</th>
          <th scope="col">Principal intérêt</th>
          <th scope="col">Âge</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Chris</th>
          <td>Tables HTML</td>
          <td>22</td>
        </tr>
        <tr>
          <th scope="row">Dennis</th>
          <td>Accessibilité web</td>
          <td>45</td>
        </tr>
        <tr>
          <th scope="row">Sarah</th>
          <td>Frameworks JavaScript</td>
          <td>29</td>
        </tr>
        <tr>
          <th scope="row">Karen</th>
          <td>Performance web</td>
          <td>36</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colspan="2">Âge moyen</th>
          <td>33</td>
        </tr>
      </tfoot>
    </table>

        `
    // content: `
    //   <h1>The Complete Guide to Modern Web Development</h1>
    //   <p>Web development has evolved significantly over the past decade. What once required multiple tools and complex setups can now be accomplished with modern frameworks and libraries that prioritize developer experience.</p>

    //   <h2>Getting Started</h2>
    //   <p>Before diving into the technical details, it's important to understand the foundational concepts that make modern web development possible.</p>

    //   <blockquote>
    //     <p>"The best code is no code at all. Every new line of code you willingly bring into the world is code that has to be debugged, code that has to be read and understood." - Jeff Atwood</p>
    //   </blockquote>

    //   <p>This philosophy guides much of modern development practices, emphasizing simplicity and maintainability over complexity.</p>

    //   <hr>

    //   <h2>Key Technologies</h2>
    //   <p>Here are the essential technologies every web developer should be familiar with:</p>

    //   <ul>
    //     <li>HTML5 and semantic markup</li>
    //     <li>CSS3 with modern layout techniques
    //       <ul>
    //         <li>Flexbox for one-dimensional layouts</li>
    //         <li>Grid for two-dimensional layouts</li>
    //         <li>Custom properties (CSS variables)</li>
    //       </ul>
    //     </li>
    //     <li>JavaScript (ES6+)</li>
    //     <li>TypeScript for type safety</li>
    //   </ul>

    //   <h3>Framework Comparison</h3>
    //   <p>Choosing the right framework depends on your project requirements:</p>

    //   <ol>
    //     <li>React - Component-based UI library</li>
    //     <li>Vue - Progressive framework</li>
    //     <li>Angular - Full-featured platform</li>
    //     <li>Svelte - Compile-time framework</li>
    //   </ol>

    //   <hr>

    //   <h2>Best Practices</h2>
    //   <p>Following established best practices ensures your code remains maintainable and scalable.</p>

    //   <blockquote>
    //     <p>Always write code as if the person who ends up maintaining it is a violent psychopath who knows where you live.</p>
    //   </blockquote>

    //   <h3>Code Organization</h3>
    //   <p>A well-organized codebase is crucial for long-term project success. Consider these principles:</p>

    //   <ul>
    //     <li>Separation of concerns</li>
    //     <li>DRY (Don't Repeat Yourself)</li>
    //     <li>KISS (Keep It Simple, Stupid)</li>
    //   </ul>

    //   <p>By following these guidelines, you'll create applications that are easier to maintain, test, and extend over time.</p>  
    //   `
  });

  useEditorState({
    editor,
    selector: ctx => {
      const { $from } = ctx.editor.state.selection;
      const cell = findParentNodeClosestToPos($from, node => node.type.name === 'tableCell'
        || node.type.name === 'tableHeader');
      if (cell) {
        console.log('Inside table cell')
      }

      return null;
    }
  });

  if (!editor) return null;

  return (
    <main>
      <Toolbar />
      <div className="editor-container">
        <EditorContent editor={editor} />

        <BubbleMenu editor={editor} />

        <GutterFloatingMenu editor={editor} />

        <TableFloatingMenu editor={editor} />
      </div>
    </main>
  );
}

export default Editor;
