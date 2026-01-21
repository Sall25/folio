import type { ReactNode } from "react";
import { useNavigation } from "../context";

interface ContentProps {
  children: ReactNode;
  className?: string;
}

export default function Content({ children, className = 'inline-block' }: ContentProps) {
  const { open, setOpen } = useNavigation();

  if (!open) return null;

  return (
    <div
      onMouseLeave={() => setOpen(false)}
      className={className}
    >
      {children}
    </div>
  );
}