import type { Level } from "@tiptap/extension-heading"
import { Editor, useEditorState } from "@tiptap/react"
import type { StyleItem, StyleLabel } from "./types"
import { Code2, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Text } from "lucide-react"

export function StyleMenu({ editor, onActiveChange }: { editor: Editor, onActiveChange?: (label: StyleLabel) => void }) {
  const {
    isTextActive,
    isBlockQuoteActive,
    isCodeBlockActive,
    isActiveHeadingLevel,
    isBulletListActive,
    isOrderedListActive
  } = useEditorState({
    editor,
    selector(ctx) {
      return {
        isTextActive: () => {
          if (ctx.editor.isActive('paragraph')) {
            onActiveChange?.('Text')
            return true
          }
          return false
        },
        isBlockQuoteActive: () => {
          if (ctx.editor.isActive('blockquote')) {
            onActiveChange?.('Blockquote')
            return true
          }
          return false
        },
        isCodeBlockActive: () => {
          if (ctx.editor.isActive('codeBlock')) {
            onActiveChange?.('Code Block')
            return true
          }
          return false
        },
        isActiveHeadingLevel: (level: Level) => {
          if (ctx.editor.isActive('heading', { level })) {
            switch (level) {
              case 1: onActiveChange?.('Heading 1')
                break;
              case 2: onActiveChange?.('Heading 2')
                break;
              case 3: onActiveChange?.('Heading 3')
                break;
              default:
                break;
            }
            return true
          }
          return false
        },
        isBulletListActive: () => {
          if (ctx.editor.isActive('bulletList')) {
            onActiveChange?.('Bullet List')
            return true
          }
          return false
        },
        isOrderedListActive: () => {
          if (ctx.editor.isActive('orderedList')) {
            onActiveChange?.('Ordered List')
            return true
          }
          return false
        }
      }
    },
  })

  const items: StyleItem[] = 
  [
    {
      label: 'Turn into',
      type: 'Title',
      isActive: false
    },
    {
      label: 'Text',
      icon: Text,
      isActive: isTextActive(),
      type: 'Mark',
      run: () => editor.chain().focus().setParagraph().run()
    },
    {
      label: 'Heading 1',
      icon: Heading1,
      isActive: isActiveHeadingLevel(1),
      type: 'Mark',
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      isActive: isActiveHeadingLevel(2),
      type: 'Mark',
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      isActive: isActiveHeadingLevel(3),
      type: 'Mark',
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
      label: 'Bullet List',
      icon: List,
      isActive: isBulletListActive(),
      type: 'Mark',
      run: () => editor.chain().focus().toggleBulletList().run()
    },
    {
      label: 'Ordered List',
      icon: ListOrdered,
      isActive: isOrderedListActive(),
      type: 'Mark',
      run: () => editor.chain().focus().toggleOrderedList().run()
    },
    {
      label: 'Code Block',
      icon: Code2,
      isActive: isCodeBlockActive(),
      type: 'Mark',
      run: () => editor.chain().focus().toggleCodeBlock().run()
    },
    {
      label: 'Blockquote',
      icon: Quote,
      isActive: isBlockQuoteActive(),
      type: 'Mark',
      run: () => editor.chain().focus().toggleBlockquote().run()
    }
  ]

  return (
    <>
      {items.map((item, index) => {
        const Icon = item.icon

        if (item.type === 'Title') {
          return (
            <span
              key={index}
              className="dropdown-title"
            >
              {item.label}
            </span>
          )
        }

        return (
          <span
            key={index}
            onClick={() => item.run?.()}
            className={`dropdown-item ${item.isActive ? 'selected' : ''}`}
          >
            {Icon && <Icon className="icon" size={16} />}

            <span>{item.label}</span>
          </span>
        )
      })}

    </>
  )
}