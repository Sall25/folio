import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Page } from "src/components/tiptap-templates/simple/types";

export type MentionItem = {
  id: string;
  label: string;
  avatar?: string;
  role?: string;
  title?: "Date" | "People" | "Pages";
  date?: string;
  type?: "user" | "page" | "date" | "divider";
  cover?: Page["cover"];
};

export type MentionSuggestion = Omit<SuggestionOptions<MentionItem>, "editor">;

export type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export type MentionListProps = {
  items: MentionItem[];
  command: (item: MentionItem) => void;
};
