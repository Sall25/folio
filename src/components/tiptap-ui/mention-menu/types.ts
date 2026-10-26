import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Page } from "src/types";

export type MentionItem = {
  id: string;
  label: string;
  avatar?: string;
  role?: string;
  title?: "Date" | "People" | "Pages" | "Rows" | "NewPage";
  date?: string;
  type?: "user" | "page" | "date" | "row" | "divider" | "action" | "more";
  /** Action items: what choosing it does. "createIn" is the page picked
   *  after "Add new page in…" (parentId says where). */
  action?: "invite" | "subpage" | "pageIn" | "createIn";
  /** The title a new page gets (what was typed after "@"). */
  newTitle?: string;
  parentId?: string | null;
  /** Page items: where the page is ("Reading List / Books"). */
  path?: string;
  /** "More results" items: how many are hidden. */
  count?: number;
  /** Row items: the row's ID ("TASK-12"), when its database has one. */
  idText?: string;
  cover?: Page["cover"];
  /** Date items: the ISO date the chip starts with, and how it reads. */
  iso?: string;
  hint?: string;
  remind?: string;
  includeTime?: boolean;
};

export type MentionSuggestion = Omit<SuggestionOptions<MentionItem>, "editor">;

export type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export type MentionListProps = {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  /** What was typed after "@" (the suggestion's query). */
  query?: string;
};

/** A database row the @ menu can mention (set by the menu from the loaded
 *  pages and databases, read by the suggestion's items()). */
export type RowMentionEntry = {
  id: string;
  title: string;
  idText: string;
  cover: Page["cover"];
  /** The database it's in, so two rows with the same title can be told
   *  apart. */
  dbName: string;
};
