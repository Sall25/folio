import type { ComponentType } from "react";

export type ColorType = { color: string, name?: string, type: 'text' | 'highlight' }

export type MenuItem = {
  label: string;
  type: 'Item' | 'Separator' | 'Sub' | 'Title';
  content?: MenuItem[];
  icon?: ComponentType<Record<string, unknown>>
  color?: ColorType;
  action?: () => void;
  isActive?: boolean;
}

export type TextBlockKind = "paragraph" | "heading" | "blockquote" | 'codeBlock' | 'listItem' | 'orderedList' | 'bulletList';

export type TextBlockConfig = {
  title: string;
};

export type RecentType = Record<ColorType['type'], ColorType[]>