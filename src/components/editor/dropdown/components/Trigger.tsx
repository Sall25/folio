import { type ReactNode } from "react";
import { useDropdown } from "../context";

interface TriggerProps {
  children: ReactNode;
}

export default function Trigger({ children }: TriggerProps) {
  const { open, setOpen, scheduleClose } = useDropdown();

  return (
    <button
      onClick={() => setOpen(!open)}
      onMouseDown={(e) => e.preventDefault()}
      onMouseLeave={scheduleClose}
      className="flex items-center gap-1 rounded-lg text-neutral-600
        dark:text-neutral-200 hover:bg-neutral-100
        dark:hover:bg-neutral-800 px-1.5 py-0.5
    "
    >
      {children}
    </button>
  );
}