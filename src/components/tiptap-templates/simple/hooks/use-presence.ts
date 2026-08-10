import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string | null;
}

export function usePresence(
  provider: HocuspocusProvider | null,
): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!provider) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsers([]);
      return;
    }
    const awareness = provider.awareness;
    if (!awareness) return;

    const read = () => {
      const seen = new Map<string, PresenceUser>();
      awareness.getStates().forEach((state) => {
        const u = (state as { user?: PresenceUser }).user;
        if (u?.id) seen.set(u.id, u); // dedupe by user id (multi-tab)
      });
      setUsers([...seen.values()]);
    };

    read();
    awareness.on("change", read);
    return () => awareness.off("change", read);
  }, [provider]);

  return users;
}
