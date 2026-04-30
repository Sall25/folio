import { createContext, useContext } from "react";
import type { UseVersionsReturn } from "src/components/tiptap-ui/version-history/use-versions";

type VersionContextType = UseVersionsReturn & {
  versionHistoryOpen: boolean;
  onVersionHistoryOpenChanged: (v: boolean) => void;
};

export const VersionContext = createContext<VersionContextType | null>(null);

export function useVersionContext() {
  const ctx = useContext(VersionContext);
  if (!ctx)
    throw new Error("useVersionContext must be used within VersionProvider");
  return ctx;
}
