
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
          if (event.key === 'Enter') {
            enterHandler();
            return true;
          }
          return false;
        }
      };
    }, [items, command, selectedIndex]);

    return (
      <div className='emoji-dropdown'>
        {items.length === 0 && (
          <span className='p-2 text-sm'>No Result</span>
        )}
        {
          items.map((item, index) => (
            <button
              className={`emoji-item ${index === selectedIndex ? 'is-selected' : ''}`}
              key={index}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
            >
              <img
                width={20}
                height={20}
                alt={item.shortcodes[0]}
                src={item.fallbackImage || ''}
              />
            </button>
          ))
        }
      </div>
    )
  })