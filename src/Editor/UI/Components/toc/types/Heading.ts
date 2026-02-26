import type { Level } from "@tiptap/extension-heading";

export type Heading = {
  id: string;
  title: string;
  level: Level;
  from: number;
  to: number;
  pos: number;
}
