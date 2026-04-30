import type { TocItem } from "src/components/tiptap-node/toc-node/toc-context";
import type { UseThreadsOnPageReturn } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";

export type EditorExtensionRefs = {
  setTocContent: (content: TocItem[]) => void;
  setActivePageId: (id: number | undefined) => void;
} & Partial<UseThreadsOnPageReturn>;
