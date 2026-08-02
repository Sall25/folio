import { createContext, useContext } from "react";
import { type PageCapabilities } from "src/hooks/use-page-role";

// Provides the active page's capabilities to the whole editor subtree, so the
// editor, toolbar, comment affordances, and menus all gate off one source
// without each re-fetching the role.
const PageCapabilitiesContext = createContext<PageCapabilities | null>(null);

export function usePageCaps(): PageCapabilities {
  const ctx = useContext(PageCapabilitiesContext);
  // Safe default: no access until the provider resolves. Prevents accidental
  // edit/comment affordances rendering before the role is known.
  return (
    ctx ?? {
      role: null,
      canView: false,
      canComment: false,
      canEditContent: false,
      canManageAccess: false,
      canDeletePage: false,
      isLoading: true,
    }
  );
}
