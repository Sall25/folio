/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { Level } from '@tiptap/extension-heading'
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';


type MarkType = 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'codeBlock' | (string & {});

export type SlashItem = {
  id: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  mark?: { type: MarkType; level?: Level }
  isActive?: boolean
  run?: (editor: Editor) => void
}

// Props received from ReactRenderer via Tiptap Suggestion
type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number
  onClickItem?: (item: SlashItem) => void
}


export default function SlashList(props: Props) {
  const { items = [], selectedIndex = 0, onClickItem } = props
  const [menuVisible, setMenuVisible] = useState(false)

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMenuVisible(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const el = itemRefs.current[selectedIndex]
    if (!el) return

    el.scrollIntoView({
      block: 'nearest', 
      inline: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedIndex])


  const isSelectable = (item: any) =>
    item.mark?.type !== 'title' && item.mark?.type !== 'separator'

  return (
    <div
      className={clsx('slash-menu', { active: menuVisible })}
      role="listbox"
      aria-label="Slash commands"
    >
      {items.length === 0 ? (
        <div className="slash-empty">No commands</div>
      ) : (
        items.map((item, i) => {
          const selectable = isSelectable(item)
          const isActive = selectable && i === selectedIndex
          const Icon = item.icon

          return (
            <div
              key={item.id}
              ref={(node) => {
                if (selectable) itemRefs.current[i] = node
              }}
              role={selectable ? 'option' : undefined}
              aria-selected={selectable ? isActive : undefined}
              className={clsx('slash-item', {
                selected: isActive,
                'is-title': item.mark?.type === 'title',
                'is-separator': item.mark?.type === 'separator',
              })}
              onMouseDown={(e) => {
                if (!selectable) return
                e.preventDefault()
                onClickItem?.(item)
              }}
            >
              {item.mark?.type === 'title' && (
                <span className="slash-title">{item.title}</span>
              )}

              {item.mark?.type === 'separator' && <hr />}

              {selectable && (
                <>
                  <span className="icon">
                    {Icon && <Icon className="icon" />}
                  </span>
                  <span>{item.title}</span>
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}


