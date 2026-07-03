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

/**
 * One Yjs doc + Hocuspocus connection per page. Recreates both whenever
 * `page.id` changes (switching pages), and cleans up the previous
 * connection on the way out.
 *
 * Seeding of existing content is NOT done here — it happens once on the
 * server in onLoadDocument (the documented, race-free place). By the time
 * this hook reports `isSynced`, the doc already holds the correct content.
 */
export function useCollabDoc(page: Page | null): UseCollabDocResult {
  const { session } = useSession();
  const [isSynced, setIsSynced] = useState(false);

  const ydoc = useMemo(() => new Y.Doc(), [page?.id]);

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

    const handleSynced = () => setIsSynced(true);
    provider.on("synced", handleSynced);

    return () => {
      provider.off("synced", handleSynced);
      provider.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, page?.id]);

  return { ydoc, provider, isSynced };
}
