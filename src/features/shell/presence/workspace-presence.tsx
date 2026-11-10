import { useEffect } from "react";
import { supabase } from "src/api/supabase-client";
import { location } from "src/app/routes";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { setOnline, type OnlinePerson } from "./workspace-online";

// Who's online in the workspace right now, and where (the page or room
// they're on, as an address in the app). One Supabase Realtime presence
// channel per workspace: everyone signed in joins it with their current
// address, updated as they move. The desktop Home's People card reads it
// (useWorkspaceOnline, workspace-online.ts). Pages and rooms keep their own
// presence (the editor, useRoomPresence); this one only says who's around.
//
// A viewer only names a page or room they can see themselves (from their
// own cache); otherwise it's just "in a page".
// NOTE: like the rooms' presence channels, plain presence isn't covered by
// RLS — Realtime Authorization should gate these before launch.
// Mount once in the signed-in app. Renders nothing.

const addressOf = (l: { pathname: string; search: string; hash: string }) =>
  `${l.pathname}${l.search}${l.hash}`;

export function WorkspacePresence() {
  const { workspaceId } = useCurrentWorkspace();
  const { person } = useCurrentPerson();
  const personId = person?.id ?? null;
  const name = person?.name ?? "";
  const avatarUrl = person?.avatarUrl ?? null;

  useEffect(() => {
    if (!workspaceId || !personId) return;
    const channel = supabase.channel(`presence:workspace:${workspaceId}`, {
      config: { presence: { key: personId } },
    });
    const me = (): OnlinePerson => ({
      id: personId,
      name,
      avatarUrl,
      path: addressOf(location.history.location),
    });
    let joined = false;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as unknown as Record<
          string,
          OnlinePerson[]
        >;
        setOnline(
          Object.values(state)
            .map((entries) => entries[entries.length - 1])
            .filter((p): p is OnlinePerson => !!p && !!p.id),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          joined = true;
          await channel.track(me());
        }
      });

    // Moving to another page or room: the others see where.
    const unlisten = location.history.listen(() => {
      if (joined) void channel.track(me());
    });

    return () => {
      unlisten();
      void supabase.removeChannel(channel);
      setOnline([]);
    };
  }, [workspaceId, personId, name, avatarUrl]);

  return null;
}
