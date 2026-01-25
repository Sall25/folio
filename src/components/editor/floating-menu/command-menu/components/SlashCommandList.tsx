/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import type { SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'

export type SlashItem = {
  id: string
  title: string
  run: (editor: Editor) => void
}

// Props received from ReactRenderer via Tiptap Suggestion
type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number
  onClickItem?: (item: SlashItem) => void
}

export default function SlashList(props: Props) {
  const { items = [], query = '', selectedIndex = 0, onClickItem } = props

  return (
    <div className="slash-menu" role="listbox" aria-label="Slash commands">
      <div className="slash-header">Commands</div>

      {items.length === 0 ? (
        <div className="slash-empty">No commands</div>
      ) : (
        items.map((item, i) => {
          const isActive = i === selectedIndex
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isActive}
              className={`slash-item ${isActive ? 'is-active' : ''}`}
              onMouseDown={(e) => {
                // prevent the editor from losing focus
                e.preventDefault()
                onClickItem?.(item)
              }}
            >
              <div className="slash-item-title">{item.title}</div>
            </div>
          )
        })
      )}
    </div>
  )
}
