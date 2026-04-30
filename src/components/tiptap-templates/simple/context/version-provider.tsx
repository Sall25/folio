import type { ReactNode } from "react";
import type { UseVersionsReturn } from "src/components/tiptap-ui/version-history/use-versions";
import { VersionContext } from "./version-context";

export function VersionProvider({
  versions,
  children,
}: {
  versions: UseVersionsReturn & {
    versionHistoryOpen: boolean;
    onVersionHistoryOpenChanged: (v: boolean) => void;
  };
  children: ReactNode;
}) {
  return (
    <VersionContext.Provider value={versions}>
      {children}
    </VersionContext.Provider>
  );
}
