
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { EmojiListRef, EmojiListProps } from '.'
import { Card, CardGroupLabel } from '../card';
import { Button } from '../button';

import './emojiList.scss'

export const EmojiList = forwardRef<EmojiListRef, EmojiListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

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

    return (
      <Card
        //  className='slash-menu active'
        style={{
          justifyContent: 'left',
          alignItems: 'flex-start',
          minWidth: '230px',
          gap: '8px',
          padding: '10px'
        }}
      >
        {items.length === 0 && (
          <CardGroupLabel className='slash-empty'>No Result</CardGroupLabel>
        )}
        {
          items.map((item, index) => (
            <Button
              className='emoji-item'
              data-highlighted={index === selectedIndex}
              //   className={`slash-item ${index === selectedIndex ? 'selected' : ''}`}
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