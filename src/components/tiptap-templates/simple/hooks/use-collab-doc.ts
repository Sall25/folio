import { useEffect, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "src/hooks/use-session";
import type { Page } from "src/types";

const HOCUSPOCUS_URL = import.meta.env.VITE_HOCUSPOCUS_URL;

if (!HOCUSPOCUS_URL) {
  throw new Error("VITE_HOCUSPOCUS_URL is not configured");
}

interface UseCollabDocResult {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  isSynced: boolean;
}

export function useCollabDoc(page: Page | null): UseCollabDocResult {
  const { session } = useSession();
  const pageId = page?.id ?? null;
  const token = session?.access_token ?? null;

  const [doc, setDoc] = useState<{
    ydoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
  }>({ ydoc: null, provider: null });

  // Track WHICH provider has synced. Derived isSynced avoids setState-in-body.
  const [syncedProvider, setSyncedProvider] =
    useState<HocuspocusProvider | null>(null);

  // Creation AND lifecycle ownership both live here now — previously
  // creation happened in useMemo (during render) while ownership/cleanup
  // lived in a separate effect. That split meant React StrictMode's
  // mount->cleanup->mount could destroy() the ONE memoized provider on the
  // synthetic unmount (often while the socket was still CONNECTING — hence
  // "WebSocket is closed before the connection is established"), then
  // reuse that same now-destroyed instance on the synthetic remount, since
  // useMemo's deps hadn't changed. No new connection was ever created
  // after that — not a harmless dev warning, a permanently dead provider.
  //
  // Creating the provider INSIDE the effect means each effect invocation
  // owns a provider it created itself: the synthetic unmount destroys ITS
  // instance, and the synthetic remount creates a genuinely NEW one that
  // connects fresh. You may still see one such warning in dev from the
  // first (StrictMode-discarded) instance — that's expected and matches
  // "if the connection eventually succeeds, the message can be ignored."
  // What matters is the second instance actually connects, which this
  // fixes.
  useEffect(() => {
    if (!pageId || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc({ ydoc: null, provider: null });
      setSyncedProvider(null);
      return;
    }

    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `page:${pageId}`,
      document: ydoc,
      token,
    });

    setDoc({ ydoc, provider });

    const handleSynced = () => setSyncedProvider(provider);
    provider.on("synced", handleSynced);

    return () => {
      provider.off("synced", handleSynced);
      provider.destroy();
      ydoc.destroy();
      setSyncedProvider((prev) => (prev === provider ? null : prev));
    };
  }, [pageId, token]);

  const isSynced = syncedProvider !== null && syncedProvider === doc.provider;

  return { ydoc: doc.ydoc, provider: doc.provider, isSynced };
}
