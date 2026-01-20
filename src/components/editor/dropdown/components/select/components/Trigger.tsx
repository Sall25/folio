import type { ReactNode } from "react";
import { useSelect } from "../selectContext";

interface TriggerProps {
  children: ReactNode;
}

export default function Trigger({ children }: TriggerProps) {
  const { open, setOpen, scheduleClose } = useSelect();

  return (
    <button
      onClick={() => setOpen(!open)}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={scheduleClose}
      className="flex w-full items-center justify-between rounded text-neutral-600
      dark:text-neutral-200 hover:bg-neutral-100
      dark:hover:bg-neutral-800 text-sm px-1 py-0.5"
    >
      {children}
    </button>
  );
}