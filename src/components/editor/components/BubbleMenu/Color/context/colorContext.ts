import { createContext, useContext } from "react";
import { Editor } from "@tiptap/react";
import { type ColorType } from "../types";

export type RecentType = Record<'text' | 'highlight', ColorType[]>;

type ColorContextType = {
  editor: Editor;
  currentColor: string;
  currentHighlight: string,
  recent: RecentType;
  addRecentColor: (color: { css: string }, type: 'text' | 'highlight') => void;
}

export const ColorContext = createContext<ColorContextType | null>(null);

export function useColorContext() {
  const ctx = useContext(ColorContext);
  if (!ctx) {
    throw new Error('Color component must be inside ColorDropdown')
  }

  return ctx;
}