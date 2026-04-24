import type { Page } from "src/components/tiptap-templates/simple/types";

export type Version = {
  id: string;
  pageId: string;
  title: string;
  content: Page["content"];
  createdAt: string;
  name?: string; // if named by user
  isNamed: boolean;
};
