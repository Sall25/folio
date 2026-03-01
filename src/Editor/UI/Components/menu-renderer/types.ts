import type { ComponentType } from "react";

export type StyleItem = {
  label: string;
  icon?: ComponentType<{ className?: string; size?: number; }>;
  type?: 'Mark' | 'Title';
  run?: () => void;

  isActive: boolean | false;
}

export type StyleLabel =
  | 'Text'
  | 'Heading 1'
  | 'Heading 2'
  | 'Heading 3'
  | 'Bullet List'
  | 'Ordered List'
  | 'Code Block'
  | 'Blockquote'

export type ColorType = { color: string, name?: string, type: 'text' | 'highlight' }
export type RecentType = Record<ColorType['type'], ColorType[]>
export type ColorMenuItem = {
  label: string;
  type: 'ColorItem' | 'Title' | 'Separator';
  color?: ColorType;
  icon?: ComponentType<{ className?: string; size?: number; fill?: string; stroke?: string; }>;
  onSelect?: () => void;
}


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

