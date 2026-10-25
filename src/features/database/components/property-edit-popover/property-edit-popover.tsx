import { Settings2 } from "src/components/icons";
import type { ReactNode } from "react";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";

export function PropertyEditPopover({ children }: { children: ReactNode }) {
  return (
    <NavigableMenuItem
      Icon={Settings2}
      label="Edit property"
      align="center"
      side="right"
      alignOffset={6}
    >
      {children}
    </NavigableMenuItem>
  );
}
