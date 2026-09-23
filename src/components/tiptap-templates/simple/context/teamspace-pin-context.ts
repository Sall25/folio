import { createContext, useContext } from "react";
import type { ID } from "src/types";

// Pin controls for the teamspace currently open in the sidebar. Provided by
// SidebarBody only when the current user is a teamspace OWNER inside a
// teamspace; null everywhere else, so rows show no pin action.
export interface TeamspacePinControl {
  teamspaceId: ID;
  isPinned: (pageId: ID) => boolean;
  setPinned: (pageId: ID, pinned: boolean) => void;
}

export const TeamspacePinContext = createContext<TeamspacePinControl | null>(
  null,
);

export function usePinControl(): TeamspacePinControl | null {
  return useContext(TeamspacePinContext);
}
