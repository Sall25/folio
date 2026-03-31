import type { SuggestionKeyDownProps, SuggestionOptions } from '@tiptap/suggestion'

export type MentionItem = {
  id: string;
  label: string;
  avatart?: string;
}

export type MentionSuggestion = Omit<
  SuggestionOptions<MentionItem>,
  'editor'
>

export type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}


export type MentionListProps = {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}
