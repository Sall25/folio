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
};

export type Page = {
  id: string;
  title: string;
  settings: PageSettings;
  cover: PageCover;
  content: JSONContent;
  createdAt: string;
  updatedAt: string | null;
  parentId: string | null;
  children: Page[];
};

export type SimpleEditorContentProps = {
  activePage: Page;
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  sidebarWidth: number;
  collapsed: boolean;
  updatePageAsync: (page: Page) => Promise<void>;
  addCoverAsync: (id: string) => Promise<void>;
};

export type SaveState = "saved" | "unsaved" | "saving";
