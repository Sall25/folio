/* eslint-disable @typescript-eslint/no-explicit-any */


import { Mention } from '@tiptap/extension-mention'
import type { MentionItem, MentionListRef } from './types'
import { ReactRenderer } from '@tiptap/react'
import MentionList from './MentionList'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { type MentionSuggestion } from './types'

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
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: any) => {
          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as any,
            appendTo: () => document.body,
            content: reactRenderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: any) {
          reactRenderer?.updateProps(props)
          popup?.[0].setProps({
            getReferenceClientRect: props.clientRect as any,
          })
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0].hide()
            return true
          }

          return reactRenderer?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup?.[0].destroy()
          reactRenderer?.destroy()
        },
      }
    },
  } satisfies MentionSuggestion,
})
