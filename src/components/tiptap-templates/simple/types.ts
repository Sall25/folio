import type { JSONContent } from "@tiptap/core";

export type PageSettings = {
  width: "medium" | "full";
  text: "small" | "normal";
  locked: boolean;
};

export type PageCover = {
  iconName: string | null;
  coverImage: string | null;
  target: "Emoji" | "Icons" | null;
  color?: string;
  gradient?: string;
  positionY?: number;
};

export type Page = {
  id: number;
  title: string;
  settings: PageSettings;
  cover: PageCover;
  content: JSONContent;
  createdAt: string;
  updatedAt: string | null;
  parentId: number | null;
  children: Page[];
};

export type SimpleEditorContentProps = {
  activePage: Page;
  pages: Page[];
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  sidebarWidth: number;
  collapsed: boolean;
  updatePageAsync: (page: Page) => Promise<void>;
  addCoverAsync: (id: string) => Promise<void>;
  addPageAsync: ({
    title,
    parentId,
  }: {
    title: number;
    parentId: number | null;
  }) => Promise<Page>;
};

export type SaveState = "saved" | "unsaved" | "saving";
