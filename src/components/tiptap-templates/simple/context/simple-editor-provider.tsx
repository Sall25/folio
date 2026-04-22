import { useActivePage } from "../use-active-page";
import { usePages } from "../use-pages";
import { useThreadsOnPage } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import type { ReactNode } from "react";
import { SimpleEditorContext } from "./simple-editor-context";

interface SimpleEditorProviderProps {
  children: ReactNode;
}

export function SimpleEditorProvider({ children }: SimpleEditorProviderProps) {
  const activePage = useActivePage();
  const { addPageAsync } = usePages();
  const threads = useThreadsOnPage();

  return (
    <SimpleEditorContext.Provider
      value={{
        ...activePage,
        addPageAsync,
        ...threads,
      }}
    >
      {children}
    </SimpleEditorContext.Provider>
  );
}
