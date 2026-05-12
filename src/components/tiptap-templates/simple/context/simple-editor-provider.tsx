import { useActivePage } from "../use-active-page";
import { usePages } from "../use-pages";
import { useEffect, useMemo, type ReactNode } from "react";
import { SimpleEditorContext } from "./simple-editor-context";
import { ActivePageProvider } from "./active-page-provider";
import { useEditorRefs } from "./editor-refs-context";

interface SimpleEditorProviderProps {
  children: ReactNode;
}

export function SimpleEditorProvider({ children }: SimpleEditorProviderProps) {
  const refsRef = useEditorRefs();
  const activePage = useActivePage();
  const { addPageAsync, isLoading } = usePages();

  // keep refs current — extensions always call latest versions
  useEffect(() => {
    refsRef.current.setActivePageId = activePage.setActivePageId;
  }, [activePage.setActivePageId, refsRef]);

  const simpleEditorContextValue = useMemo(
    () => ({
      ...activePage,
      addPageAsync,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePage.activePage, activePage.pages, isLoading, addPageAsync],
  );

  return (
    <ActivePageProvider>
      <SimpleEditorContext.Provider value={simpleEditorContextValue}>
        {children}
      </SimpleEditorContext.Provider>
    </ActivePageProvider>
  );
}
