import type { SuggestionKeyDownProps } from "@tiptap/suggestion";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { EmojiListRef, EmojiListProps } from "./types";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./emoji-list.scss";

// onClose is injected by the extension's render() so the footer button and the
// in-component Escape handler both route through the same teardown as the
// suggestion plugin's own exit. Declared as an intersection here so ./types
// stays untouched.
type Props = EmojiListProps & { onClose?: () => void };

export const EmojiList = forwardRef<EmojiListRef, Props>(
  ({ items, command, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => {
      const upHandler = () => {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
      };

      const downHandler = () => {
        setSelectedIndex((i) => (i + 1) % items.length);
      };

      const enterHandler = () => {
        const item = items[selectedIndex];
        if (item) command(item);
      };

      return {
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "ArrowUp") {
            upHandler();
            return true;
          }
          if (event.key === "ArrowDown") {
            downHandler();
            return true;
          }

          if (event.key === "Enter" || event.key === " ") {
            enterHandler();
            return true;
          }

          // Second Escape path. The extension handles Escape first, but if it
          // ever delegates here instead, the menu still tears down.
          if (event.key === "Escape") {
            onClose?.();
            return true;
          }

          return false;
        },
      };
    }, [items, command, selectedIndex, onClose]);

    useEffect(() => {
      const raf = requestAnimationFrame(() => {
        setMenuVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }, []);

    if (items.length === 0) return null;

    return (
      <Card className="emoji-menu" data-emoji-menu-open={menuVisible}>
        <div className="emoji-menu__list">
          {items.map((item, index) => (
            <Button
              className="emoji-item"
              variant="ghost"
              data-highlighted={index === selectedIndex}
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(index);
              }}
            >
              <span>{item.emoji}</span>
              <span
              //className='slash-item border-none'
              >
                {item.name}
              </span>
            </Button>
          ))}
        </div>

        <div className="emoji-menu__footer">
          <Button
            className="emoji-menu__close"
            variant="ghost"
            type="button"
            aria-label="Close emoji menu"
            onMouseDown={(e) => {
              // preventDefault keeps focus in the editor so exitSuggestion can
              // act on a live selection.
              e.preventDefault();
              onClose?.();
            }}
          >
            <span>Close</span>
            <kbd className="emoji-menu__kbd">Esc</kbd>
          </Button>
        </div>
      </Card>
    );
  },
);

EmojiList.displayName = "EmojiList";
