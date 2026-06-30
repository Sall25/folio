import { createContext, useContext } from "react";

// Mirrors the search/templates context shape ({ open, onOpenChange }), plus the
// active nav id so a trigger can deep-link straight to a pane (e.g. open on
// "teamspaces" vs "people").
interface WorkspaceSettingsContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: string;
  setActiveId: (id: string) => void;
  /** Open the modal directly on a given pane. */
  openTo: (id: string) => void;
}

export const WorkspaceSettingsContext =
  createContext<WorkspaceSettingsContextValue | null>(null);

export function useWorkspaceSettings() {
  const ctx = useContext(WorkspaceSettingsContext);
  if (!ctx)
    throw new Error(
      "useWorkspaceSettings must be used within a WorkspaceSettingsProvider",
    );
  return ctx;
}
