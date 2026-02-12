import { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { EmojiExtension } from './EmojiExtension';
import type { EmojiItem } from '@tiptap/extension-emoji';



export type EmojiListRef = {
  onKeyDown: (key: SuggestionKeyDownProps) => boolean
}

export type EmojiListProps = SuggestionProps<EmojiItem, EmojiItem>

export {
  EmojiExtension
}