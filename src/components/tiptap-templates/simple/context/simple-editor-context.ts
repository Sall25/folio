import type { UseThreadsOnPageReturn } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import type { UseActivePageReturn } from "../use-active-page";
import type { UsePagesReturn } from "../use-pages";
import { createContext, useContext } from "react";

type ContextType = UseActivePageReturn &
  Pick<UsePagesReturn, "addPageAsync"> &
  UseThreadsOnPageReturn;

export const SimpleEditorContext = createContext<ContextType | null>(null);

export function useSimpleEditor() {
  const ctx = useContext(SimpleEditorContext);
  if (!ctx)
    throw new Error("useSimpleEditor must be used within SimpleEditorProvider");
  return ctx;
}
