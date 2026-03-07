
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { EmojiListRef, EmojiListProps } from './types'
import { Card, CardGroupLabel } from '@/components/tiptap-ui-primitive/card';
import { Button } from '@/components/tiptap-ui-primitive/button';

import './emoji-list.scss'

export const EmojiList = forwardRef<EmojiListRef, EmojiListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false)

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item)
      }
    };
    useImperativeHandle(ref, () => {
      const upHandler = () => {
        setSelectedIndex(i => (i + items.length - 1) % items.length);
      };

      const downHandler = () => {
        setSelectedIndex(i => (i + 1) % items.length);
      };

      const enterHandler = () => {
        const item = items[selectedIndex];
        if (item) command(item);
      };

      return {
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === 'ArrowUp') {
            upHandler();
            return true;
          }
          if (event.key === 'ArrowDown') {
            downHandler();
            return true;
          }

          if (event.key === 'Enter' || event.key === ' ') {

            enterHandler();
            return true;
          }
          return false;
        }
      };
    }, [items, command, selectedIndex]);

    useEffect(() => {
      const raf = requestAnimationFrame(() => {
        setMenuVisible(true)
      })
      return () => cancelAnimationFrame(raf)
    }, [])

    return (
      <Card
        className='emoji-menu'
        data-emoji-menu-open={menuVisible}
      >
        {items.length === 0 && (
          <CardGroupLabel className='emoji-empty'>No Result</CardGroupLabel>
        )}
        {
          items.map((item, index) => (
            <Button
              className='emoji-item'
              data-highlighted={index === selectedIndex}
              key={index}
              onMouseDown={(e) => {
                e.preventDefault()
                selectItem(index)
              }}


            >
              <span>{item.emoji}</span>
              <span
              //className='slash-item border-none'
              >
                {item.name}
              </span>
            </Button>
          ))
        }
      </Card>
    )
  })