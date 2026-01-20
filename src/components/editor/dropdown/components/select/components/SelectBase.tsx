import { useRef, useState, type ReactNode } from "react";
import { SelectContext } from "../selectContext";

interface SelectProps {
  children: ReactNode;
}

export default function SelectBase({ children }: SelectProps) {
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
    <SelectContext.Provider value={{ open, setOpen, scheduleClose, cancelClose }}
    >
      <div className="relative inline-block">
        {children}
      </div>
    </SelectContext.Provider>
  );
}