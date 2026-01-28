import { type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { EmojiExtension } from './EmojiExtension';

export type EmojiType = {
  name: string;
  shortcodes: string[],
  tags: string[];
  group?: string;
  fallbackImage: string;
}

export type EmojiListRef = {
  onKeyDown: (key: SuggestionKeyDownProps) => boolean
}

export type EmojiListProps = {
  items: EmojiType[];
  command: (item: EmojiType) => void;
}

export {
  EmojiExtension
}