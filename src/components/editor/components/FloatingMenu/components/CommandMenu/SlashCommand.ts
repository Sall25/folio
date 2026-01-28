/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core'
import Suggestion, { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import type { Plugin } from '@tiptap/pm/state'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import SlashList, { type SlashItem } from './SlashCommandList'
import { Heading1, Heading2, Heading3, List, ListOrdered, Pilcrow, Quote } from 'lucide-react'

export const SlashCommand = Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      commands: [
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
      ] as SlashItem[],
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    let reactRenderer: ReactRenderer<any> | null = null
    let tippyInstance: TippyInstance | null = null
    let selectedIndex = 0
    let currentProps: SuggestionProps<SlashItem> | null = null

    function positionPopup(props: SuggestionProps<SlashItem>, element: HTMLElement) {
      const rect = props.clientRect?.()
      if (!rect) {
        element.style.display = 'none'
        return
      }

      element.style.display = ''
      const left = rect.left + window.scrollX
      const top = rect.bottom + window.scrollY + 8

      element.style.left = `${Math.round(left)}px`
      element.style.top = `${Math.round(top)}px`
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

      document.body.appendChild(reactRenderer.element)

      tippyInstance = tippy(document.body, {
        getReferenceClientRect: () => {
          const rect = props.clientRect?.()
          return rect ?? { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 } as DOMRect
        },
        content: reactRenderer.element,
        appendTo: () => document.body,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        popperOptions: { strategy: 'fixed' },
      })

      positionPopup(props, reactRenderer.element)
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

      if (reactRenderer.element) positionPopup(props, reactRenderer.element)
      if (tippyInstance) tippyInstance.setProps({
        getReferenceClientRect: () => props.clientRect?.() ?? { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 } as DOMRect
      })
    }

    function destroyRenderer() {
      if (reactRenderer) {
        try { reactRenderer.destroy() } catch {

          console.log('Error')
        }
        try {
          if (reactRenderer.element?.parentNode) reactRenderer.element.parentNode.removeChild(reactRenderer.element)
        } catch {
          console.log('Error')
        }
        reactRenderer = null
      }
      if (tippyInstance) {
        try { tippyInstance.destroy() } catch {
          console.log('Error')
        }
        tippyInstance = null
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
