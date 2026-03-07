/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { Level } from '@tiptap/extension-heading'
import { useEffect, useRef, useState } from 'react';
import { Card, CardGroupLabel, CardItemGroup } from '@/components/tiptap-ui-primitive/card';
import { Separator } from '@/components/tiptap-ui-primitive/separator';
import { Button } from '@/components/tiptap-ui-primitive/button';

import './slash-command-list.scss'


type MarkType = 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'codeBlock' | (string & {});

export type SlashItem = {
  id: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  mark?: { type: MarkType; level?: Level }
  isActive?: (editor: Editor) => boolean
  run?: (editor: Editor) => void
}

// Props received from ReactRenderer via Tiptap Suggestion
type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number
  onClickItem?: (item: SlashItem) => void
}


export default function SlashList(props: Props) {
  const { items = [], selectedIndex = 0, onClickItem } = props

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLElement | null>(null)

  const [menuVisible, setMenuVisible] = useState(false)

  // toggle it after mount (or after 150ms for demo)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMenuVisible(true)
      if (containerRef.current) {
        containerRef.current.focus()
      }

    })
    return () => cancelAnimationFrame(raf)
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
    <Card
      className='slash-menu'
      role="listbox"
      aria-label="Slash commands"
      data-slash-menu-open={menuVisible}
    >
      {items.length === 0 ? (
        <CardGroupLabel>
          No commands
        </CardGroupLabel>
      ) : (
        items.map((item, i) => {
          const selectable = isSelectable(item)
          const isActive = selectable && i === selectedIndex
          const Icon = item.icon
          const highlighted = item.isActive?.(props.editor) || (i === selectedIndex)

          return (
            <CardItemGroup
              style={{
                minWidth: '200px'
              }}
              orientation='vertical'

              key={item.id}
              ref={(node) => {
                if (selectable) itemRefs.current[i] = node
              }}
              role={selectable ? 'option' : undefined}
              aria-selected={selectable ? isActive : undefined}
              // className={clsx('', {
              //   selected: isActive,
              //   'is-title': item.mark?.type === 'title',
              //   'is-separator': item.mark?.type === 'separator',
              // })}


              onMouseDown={(e) => {
                if (!selectable) return
                e.preventDefault()
                onClickItem?.(item)
              }}
            >
              {item.mark?.type === 'title' && (
                <CardGroupLabel className="slash-title">{item.title}</CardGroupLabel>
              )}

              {item.mark?.type === 'separator' && (
                <Separator
                  orientation='horizontal'
                />
              )}

              {selectable && (
                <Button
                  data-highlighted={highlighted}
                  className='slash-item'

                >
                  {Icon && <Icon className="tiptap-button-icon" />}
                  <span>{item.title}</span>
                </Button>
              )}
            </CardItemGroup>
          )
        })
      )}
    </Card>
  )
}


