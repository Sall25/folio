/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { Level } from '@tiptap/extension-heading'


type MarkType = 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'codeBlock' | (string & {});

export type SlashItem = {
  id: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  mark?: { type: MarkType; level?: Level }
  isActive?: boolean
  run: (editor: Editor) => void
}

// Props received from ReactRenderer via Tiptap Suggestion
type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number
  onClickItem?: (item: SlashItem) => void
}

export default function SlashList(props: Props) {
  const { items = [], selectedIndex = 0, onClickItem } = props


  return (
    <div className="slash-menu active" role="listbox" aria-label="Slash commands">

      {items.length === 0 ? (
        <div className="slash-empty">No commands</div>
      ) : (
        items.map((item, i) => {
          const Icon = item.icon
          const isActive = i === selectedIndex
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={isActive}
              className={`slash-item ${isActive ? 'selected' : ''}`}
              onMouseDown={(e) => {
                // prevent the editor from losing focus
                e.preventDefault()
                onClickItem?.(item)
              }}
            >
              <span className='icon'>{Icon && <Icon className='icon' />}</span>
              <span>{item.title}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
