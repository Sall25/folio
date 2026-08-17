import { createContext, type ReactNode } from "react";
import {
  usePageCapabilities,
  type PageCapabilities,
} from "src/hooks/use-page-role";
import { useActivePageState } from "./active-page-context";

// Provides the active page's capabilities to the whole editor subtree, so the
// editor, toolbar, comment affordances, and menus all gate off one source
// without each re-fetching the role.
const PageCapabilitiesContext = createContext<PageCapabilities | null>(null);

export function PageCapabilitiesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { activePageId } = useActivePageState();
  const caps = usePageCapabilities(activePageId);
  return (
    <PageCapabilitiesContext.Provider value={caps}>
      {children}
    </PageCapabilitiesContext.Provider>
  );
}
