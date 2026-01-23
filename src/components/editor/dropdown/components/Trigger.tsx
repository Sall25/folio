import { type ReactNode } from "react";

interface TriggerProps {
  children: ReactNode;
}

export default function Trigger({ children }: TriggerProps) {

  return (
    <button
      className=" rounded-lg text-neutral-600
        dark:text-neutral-200 hover:bg-neutral-100
        dark:hover:bg-neutral-800 px-1.5 py-0.5
    "
    >
      {children}
    </button>
  );
}