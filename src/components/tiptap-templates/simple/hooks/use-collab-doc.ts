import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "src/hooks/use-session";
import type { Page } from "src/types";

const HOCUSPOCUS_URL =
  import.meta.env.VITE_HOCUSPOCUS_URL ?? "ws://localhost:1234";
console.log("HOCUSPOCUS_URL =", HOCUSPOCUS_URL);

interface UseCollabDocResult {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  isSynced: boolean;
}

export function useCollabDoc(page: Page | null): UseCollabDocResult {
  const { session } = useSession();
  const pageId = page?.id ?? null;
  const token = session?.access_token ?? null;

  const { ydoc, provider } = useMemo(() => {
    if (!pageId || !token) return { ydoc: null, provider: null };
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `page:${pageId}`,
      document: ydoc,
      token,
    });
    return { ydoc, provider };
  }, [pageId, token]);

  // Track WHICH provider has synced. Derived isSynced avoids setState-in-body.
  const [syncedProvider, setSyncedProvider] =
    useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!provider || !ydoc) return;
    const handleSynced = () => setSyncedProvider(provider);
    provider.on("synced", handleSynced);
    return () => {
      provider.off("synced", handleSynced);
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const isSynced = syncedProvider !== null && syncedProvider === provider;

  return { ydoc, provider, isSynced };
}
