/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension, posToDOMRect } from '@tiptap/core'
import Suggestion, { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import type { Plugin } from '@tiptap/pm/state'
import SlashList, { type SlashItem } from './SlashCommandList'
import { AtSign, Heading1, Heading2, Heading3, Image, List, ListOrdered, Minus, Pilcrow, Quote, Table } from 'lucide-react'
import { computePosition, flip, offset, shift, type VirtualElement } from '@floating-ui/dom'


export const SlashCommand = Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      commands: [
        {
          id: 'style',
          title: 'Style',
          mark: { type: 'title' }
        },
        {
          id: 'p',
          title: 'Text',
          icon: Pilcrow,
          mark: { type: 'paragraph' },
          run: (editor: Editor) => editor.chain().focus().setParagraph().run(),
        },
        {
          id: 'h1',
          title: 'Heading 1',
          icon: Heading1,
          mark: { type: 'heading', level: 1 },
          run: (editor: Editor) => editor.chain().focus().setNode('heading', { level: 1 }).run(),
        },
        {
          id: 'h2',
          title: 'Heading 2',
          icon: Heading2,
          mark: { type: 'heading', level: 2 },
          run: (editor: Editor) => editor.chain().focus().setNode('heading', { level: 2 }).run(),
        },
        {
          id: 'h3',
          title: 'Heading 3',
          icon: Heading3,
          mark: { type: 'heading', level: 3 },
          run: (editor: Editor) => editor.chain().focus().setNode('heading', { level: 1 }).run(),
        },
        {
          id: 'bulletList',
          title: 'Bullet List',
          icon: List,
          run: (editor: Editor) => editor.chain().focus().toggleBulletList().run()
        },
        {
          id: 'orderedList',
          title: 'Numbered List',
          icon: ListOrdered,
          run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run()
        },
        {
          id: 'quote',
          title: 'Blockquote',
          icon: Quote,
          mark: { type: 'blockQuote' },
          run: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          id: 'styleDivider',
          title: 'separator',
          mark: { type: 'separator' },
        },
        {
          id: 'insert',
          title: 'Insert',
          mark: { type: 'title' }
        },
        {
          id: 'mention',
          title: 'Mention',
          icon: AtSign
        },
        {
          id: 'table',
          title: 'Table',
          icon: Table
        },
        {
          id: 'separator',
          title: 'Separator',
          icon: Minus,
          run(editor) {
            editor.chain().focus().setHorizontalRule().run()
          },
        },
        {
          id: 'toc',
          title: 'Table of Contents',
          icon: List
        },
        {
          id: 'insertDivider',
          title: 'separator',
          mark: { type: 'separator' },
        },
        {
          id: 'upload',
          title: 'Upload',
          mark: { type: 'title' }
        },
        {
          id: 'image',
          title: 'Image',
          icon: Image
        }

      ] as SlashItem[],
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    let reactRenderer: ReactRenderer<any> | null = null
    let selectedIndex = 0
    let currentProps: SuggestionProps<SlashItem> | null = null

    const updatePosition = (element: HTMLElement) => {
      const virtualElement: VirtualElement = {
        getBoundingClientRect: () => posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
      }
      computePosition(virtualElement, element, {
        placement: 'bottom-start',
        strategy: 'absolute',
        middleware: [shift({ padding: 8 }), flip(), offset(4)]
      }).then(({ x, y, strategy }) => {
        element.style.width = 'max-content'
        element.style.position = strategy
        element.style.left = `${x}px`
        element.style.top = `${y}px`
      })
    }

    function createRenderer(props: SuggestionProps<SlashItem>) {
      currentProps = props
      selectedIndex = 0

      reactRenderer = new ReactRenderer(SlashList, {
        editor,
        props: {
          ...props,
          selectedIndex,
          onClickItem: (item: SlashItem) => {
            props.command(item)
            exitSuggestion(editor.view)
          },
        },
      })

      reactRenderer.element.style.position = 'absolute'

      document.body.appendChild(reactRenderer.element)

      updatePosition(reactRenderer.element)
    }

    function updateRenderer(props: SuggestionProps<SlashItem>) {
      currentProps = props
      if (!reactRenderer) {
        createRenderer(props)
        return
      }

      reactRenderer.updateProps({
        ...props,
        selectedIndex,
        onClickItem: (item: SlashItem) => {
          props.command(item)
          exitSuggestion(editor.view)
        },
      })

      // if (reactRenderer.element) positionPopup(props, reactRenderer.element)
      // if (tippyInstance) tippyInstance.setProps({
      //   getReferenceClientRect: () => props.clientRect?.() ?? { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 } as DOMRect
      // })
    }

    function destroyRenderer() {

      if (reactRenderer) {
        try {
          reactRenderer.destroy()
        }
        catch {
          console.log('Error')
        }
        try {
          if (reactRenderer.element?.parentNode) reactRenderer.element.parentNode.removeChild(reactRenderer.element)
        } catch {
          console.log('Error')
        }
        reactRenderer = null
      }
      currentProps = null
    }

    const suggestion = Suggestion<SlashItem>({
      editor,
      char: '/',
      startOfLine: true,
      decorationClass: 'slash-suggestion',
      items: ({ query }) => {
        const q = (query || '').toLowerCase()
        return (this.options.commands as SlashItem[]).filter((c) =>
          c.title.toLowerCase().includes(q)
        )
      },
      command: ({ editor: ed, range, props }) => {
        ed.chain().focus().deleteRange(range).run()
        props.run(ed)
      },
      render: () => ({
        onStart: createRenderer,
        onUpdate: updateRenderer,
        onExit: destroyRenderer,
        onKeyDown: ({ event }) => {
          if (!currentProps) return false
          const items = currentProps.items || []

          switch (event.key) {
            case 'ArrowDown': {
              event.preventDefault()
              selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
              updateRenderer(currentProps)
              return true
            }
            case 'ArrowUp': {
              selectedIndex = Math.max(selectedIndex - 1, 0)
              updateRenderer(currentProps)
              return true
            }
            case 'Enter': {
              const item = items[selectedIndex]
              if (item) {
                currentProps.command(item)
                exitSuggestion(editor.view)
                return true
              }
              return false
            }
            case 'Escape':
              exitSuggestion(editor.view)
              return true
            default:
              return false
          }
        },
      }),
    })

    return [suggestion as unknown as Plugin]
  },
})
