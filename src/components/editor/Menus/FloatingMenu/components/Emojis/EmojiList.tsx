
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { EmojiListRef, EmojiListProps } from '.'


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
      <div
        className='slash-menu active'

      >
        {items.length === 0 && (
          <span className='slash-empty'>No Result</span>
        )}
        {
          items.map((item, index) => (
            <div
              className={`slash-item ${index === selectedIndex ? 'selected' : ''}`}
              key={index}
              onMouseDown={(e) => {
                e.preventDefault()
                selectItem(index)
              }}
            >
              {/* <img
                width={20}
                height={20}
                alt={item.shortcodes[0]}
                src={item.fallbackImage || ''}
              /> */}
              <span>{item.emoji}</span>
              <span className='slash-item'>{item.name}</span>
            </div>
          ))
        }
      </div>
    )
  })