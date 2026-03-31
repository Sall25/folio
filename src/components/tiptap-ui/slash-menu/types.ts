import type { Editor } from "@tiptap/react";
import type React from "react";
import type { SuggestionOptions } from '@tiptap/suggestion'

export type SlashCommandItem = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  open?: boolean;
  command: (editor: Editor) => void;
}

export type SlashSuggestion = Omit<SuggestionOptions<SlashCommandItem>, 'editor'>