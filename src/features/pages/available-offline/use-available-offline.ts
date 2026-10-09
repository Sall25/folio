import { useSession } from "src/hooks/use-session";
import {
  keptBy,
  setPageKept,
  setTeamspaceKept,
  useKeepChoices,
} from "src/lib/offline-keep";
import type { Page } from "src/types";

// "Available offline" for one page, for the page menu and the sidebar.
// On a teamspace's root page the switch keeps the whole teamspace. A page
// kept through its teamspace or as a favorite shows as kept but can't be
// switched off on its own (`locked`).
export function useAvailableOffline(page: Page | null | undefined) {
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const choices = useKeepChoices(personId);
  if (!page || !personId) return null;

  const isTeamspaceRoot = page.teamspaceId === page.id;
  const by = keptBy(page, choices);
  return {
    isTeamspaceRoot,
    kept: by !== null,
    /** How it's kept: "page", "teamspace" or "favorites" (null: not kept). */
    by,
    locked: by === "favorites" || (by === "teamspace" && !isTeamspaceRoot),
    set: (on: boolean) =>
      isTeamspaceRoot
        ? setTeamspaceKept(personId, page.id, on)
        : setPageKept(personId, page.id, on),
  };
}
