import { useCallback, useMemo, useState, type ReactNode } from "react";
import { WorkspaceSettingsContext } from "./workspace-settings-context";

export function WorkspaceSettingsProvider({
  children,
  defaultActiveId = "teamspaces",
}: {
  children: ReactNode;
  defaultActiveId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(defaultActiveId);

  const openTo = useCallback((id: string) => {
    setActiveId(id);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ open, onOpenChange: setOpen, activeId, setActiveId, openTo }),
    [open, activeId, openTo],
  );

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}
