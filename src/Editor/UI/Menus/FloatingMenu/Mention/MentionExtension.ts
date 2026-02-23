/* eslint-disable @typescript-eslint/no-explicit-any */


import { Mention } from '@tiptap/extension-mention'
import type { MentionItem, MentionListRef } from './types'
import { Editor, posToDOMRect, ReactRenderer } from '@tiptap/react'
import MentionList from './MentionList'
import { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { type MentionSuggestion } from './types'
import { computePosition, flip, shift, type VirtualElement } from '@floating-ui/dom'

export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class: 'mention',
  },

  suggestion: {
    char: '@',
    startOfLine: false,

    items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
      const users: MentionItem[] = [
        { id: '1', label: 'Jule' },
        { id: '2', label: 'Alice' },
        { id: '3', label: 'Bob' },
      ]

      return users.filter(user =>
        user.label.toLowerCase().includes(query.toLowerCase())
      )
    },

    command: ({ editor, range, props }: { editor: any, range: any, props: any }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.label,
              mentionSuggestionChar: '@',
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run()
    },

    render: () => {
      let reactRenderer: ReactRenderer<MentionListRef> | null = null

      const updatePosition = (editor: Editor, element: HTMLElement) => {
        const virtualEl: VirtualElement = {
          getBoundingClientRect: () => posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
        }
        computePosition(virtualEl, element, {
          placement: 'bottom-start',
          strategy: 'absolute',
          middleware: [shift(), flip()]
        }).then(({ x, y, strategy }) => {
          element.style.width = 'max-content'
          element.style.position = strategy
          element.style.left = `${x}px`
          element.style.top = `${y}px`
        })
      }

      return {
        onStart: (props: any) => {
          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          reactRenderer.element.style.position = 'absolute'

          document.body.appendChild(reactRenderer.element)

          updatePosition(props.editor, reactRenderer.element)
        },

        onUpdate(props: any) {
          reactRenderer?.updateProps(props)
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            reactRenderer?.destroy()
            return true
          }

          return reactRenderer?.ref?.onKeyDown(props) ?? false
        },

        onExit(props: SuggestionProps<MentionItem>) {
          const { editor, range } = props
          const { state } = editor

          const textAtRange = state.doc.textBetween(range.from, range.to, '\0', '\0')
          const cursorPos = state.selection.from

          const stillSlash = textAtRange.startsWith('@')
          const cursorInside = cursorPos >= range.from && cursorPos <= range.to + 1

          if (stillSlash && cursorInside) {
            // Ignore transient exit caused by our own transaction
            return
          }

          reactRenderer?.element.remove()
          reactRenderer?.destroy()
        },
      }
    },
  } satisfies MentionSuggestion,
})
