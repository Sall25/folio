import { useRef, useState, type ReactNode } from "react";
import { DropdownContext } from "../context";

interface DropdownProps {
  children: ReactNode;
}

export default function DropdownBase({ children }: DropdownProps) {
  const [open, setOpen] = useState(false);

  const closeTimer = useRef<number | null>(null);

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, 150); // hover delay
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  return (
    <DropdownContext.Provider
      value={{ open, setOpen, scheduleClose, cancelClose }}
    >
      <div className="relative inline-block min-w-8 px-2.5 py-1">
        {children}
      </div>
    </DropdownContext.Provider>
  );
} 