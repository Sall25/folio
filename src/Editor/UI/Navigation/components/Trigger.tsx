import type { ReactNode } from "react";
import { useNavigation } from "../context";

interface TriggerProps {
  children: ReactNode;
  className?: string;
}

export default function Trigger({ children, className = 'inline-block' }: TriggerProps) {
  const { setOpen } = useNavigation();

  return (
    <button
      onMouseOver={(e) => {
        e.preventDefault();
        setOpen(true)
      }}
      className={className}
    >
      {children}
    </button>
  );
}