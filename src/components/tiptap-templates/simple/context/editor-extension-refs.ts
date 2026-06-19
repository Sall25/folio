import type { TocItem } from "src/components/tiptap-node/toc-node/toc-context";
import type { ID } from "src/types";

export type EditorExtensionRefs = {
  setTocContent: (content: TocItem[]) => void;
  setActivePageId: (id: ID) => void;
};
