import { useState, type ReactNode } from "react";
import { NavigationContext } from "../context";

interface NavigationBaseProps {
  children: ReactNode;
  className?: string;
}

export function NavigationBase({ children, className }: NavigationBaseProps) {
  const [open, setOpen] = useState(false);

  const showFloatingTOC = () => setOpen(true);
  const hideFloatingTOC = () => setOpen(false);

  return (
    <NavigationContext.Provider
      value={{
        open,
        setOpen,
        showFloatingTOC,
        hideFloatingTOC
      }
      }>
      <div className={className}
      >
        {children}
      </div>
    </NavigationContext.Provider>
  );
}