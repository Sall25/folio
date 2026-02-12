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
import { SlashCommand, MentionExtension, GutterFloatingMenu } from './Menus/FloatingMenu'

import BubbleMenu from './Menus/BubbleMenu/BubbleMenu'
import Toolbar from './Toolbar/Toolbar'
import { CustomTableCell, CustomTableHeader, TableMenuExtension } from './Menus/FloatingMenu/components/Table/extensions'
import { GutterMenuExtension, TextBlockStyle } from './Menus/FloatingMenu/components/GutterFloatingMenu/extensions'
import { BlurSelection } from './Menus/BubbleMenu/extensions'
import { TableFloatingMenu } from './Menus/FloatingMenu/components/Table'
import { CopyNodeExtension, DeleteNodeAt, DuplicateNodeExtension } from './extensions'

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
      TextBlockStyle,
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

      MentionExtension,
      SlashCommand,
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
      GutterMenuExtension,
      // Selection.configure({
      //   className: 'selection'
      // }),
      BlurSelection,

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
     <span style="display: block;"></span>
        <h1>Éditeur – Document de test complet</h1>

    <p>
      Ceci est un <strong>paragraphe en gras</strong>, avec du <em>texte en italique</em>,
      du <u>souligné</u>, et même un <a href="https://example.com">lien externe</a>.
    </p>

    <p>
      Test de texte long pour voir comment la sélection, le bubble menu et les flottants
      se comportent quand une ligne devient vraiment, vraiment, vraiment très longue
      et dépasse la largeur normale du conteneur.
    </p>

    <hr />

    <h2>Liste à puces</h2>
    <ul>
      <li>Premier élément</li>
      <li>Deuxième élément avec <strong>mise en forme</strong></li>
      <li>
        Élément avec sous-liste
        <ul>
          <li>Sous élément A</li>
          <li>Sous élément B</li>
        </ul>
      </li>
    </ul>

    <h2>Liste numérotée</h2>
    <ol>
      <li>Étape 1</li>
      <li>Étape 2</li>
      <li>Étape 3</li>
    </ol>

    <hr />

    <h2>Bloc de citation</h2>
    <blockquote>
      Un bon éditeur ne se juge pas quand tout va bien,
      mais quand l’utilisateur fait des choses absurdes.
    </blockquote>

    <hr />

    <h2>Tableau principal (test lignes & colonnes)</h2>

    <table>
      <tr>
        <th>Nom</th>
        <th>ID</th>
        <th>Membre depuis</th>
        <th>Solde</th>
        <th>Statut</th>
      </tr>
      <tr>
        <th>Margaret Nguyen</th>
        <td>427311</td>
        <td><time datetime="2010-06-03">3 juin 2010</time></td>
        <td>0.00</td>
        <td><strong>Inactif</strong></td>
      </tr>
      <tr>
        <th>Edvard Galinski</th>
        <td>533175</td>
        <td><time datetime="2011-01-13">13 janvier 2011</time></td>
        <td>37.00</td>
        <td>Actif</td>
      </tr>
      <tr>
        <th>Hoshi Nakamura</th>
        <td>601942</td>
        <td><time datetime="2012-07-23">23 juillet 2012</time></td>
        <td>15.00</td>
        <td>Actif</td>
      </tr>
      <tr>
        <th>Très très long nom pour tester le wrapping dans une cellule</th>
        <td>778299</td>
        <td><time datetime="2015-11-02">2 novembre 2015</time></td>
        <td>1234.56</td>
        <td>Suspendu</td>
      </tr>
    </table>

    <hr />

    <h2>Tableau avec contenu complexe</h2>

    <table>
      <tr>
        <th>Tâche</th>
        <th>Description</th>
        <th>Priorité</th>
      </tr>
      <tr>
        <td>Refactor UI</td>
        <td>
          Améliorer le <strong>système de menus flottants</strong> et corriger les bugs
          liés au scroll.
        </td>
        <td>Haute</td>
      </tr>
      <tr>
        <td>Tests</td>
        <td>
          <ul>
            <li>Tester sélection multiple</li>
            <li>Tester copier/coller</li>
            <li>Tester suppression de colonnes</li>
          </ul>
        </td>
        <td>Moyenne</td>
      </tr>
      <tr>
        <td>Documentation</td>
        <td>
          Ajouter des exemples avec :
          <ol>
            <li>Tableaux</li>
            <li>Listes</li>
            <li>Menus contextuels</li>
          </ol>
        </td>
        <td>Basse</td>
      </tr>
    </table>

    <hr />

    <h2>Code block</h2>
    <pre><code>function addColumn(editor) {
      console.log("Testing floating column menu");
    }
    </code></pre>

    <p>Fin du document de test ✨</p>

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

        <GutterFloatingMenu
          editor={editor}
        />

        <TableFloatingMenu
          editor={editor}
        />
      </div>
    </main>
  );
}

export default Editor;
