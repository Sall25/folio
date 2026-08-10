import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "src/hooks/use-session";
import type { Page } from "src/types";

const HOCUSPOCUS_URL =
  import.meta.env.VITE_HOCUSPOCUS_URL ?? "ws://localhost:1234";

interface UseCollabDocResult {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  isSynced: boolean;
}

export function useCollabDoc(page: Page | null): UseCollabDocResult {
  const { session } = useSession();
  const [isSynced, setIsSynced] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ydoc = useMemo(() => new Y.Doc(), [page?.id]);

  useEffect(() => {
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

  const provider = useMemo(() => {
    if (!page || !session?.access_token) return null;
    return new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `page:${page.id}`,
      document: ydoc,
      token: session.access_token,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id, session?.access_token, ydoc]);

  useEffect(() => {
    if (!provider || !page) return;

    setIsSynced(false);
    // in useCollabDoc, in the synced handler:
    const handleSynced = () => {
      const xml = ydoc.getXmlFragment("default"); // or your content field
      console.log("[synced]", page?.id, "doc length:", xml.length);
      setIsSynced(true);
    };

    provider.on("synced", handleSynced);

    return () => {
      provider.off("synced", handleSynced);
      provider.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, page?.id]);

  return { ydoc, provider, isSynced };
}
