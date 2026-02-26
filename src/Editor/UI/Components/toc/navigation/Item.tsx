import type { ReactNode } from "react";
import { Button } from "../../button";

interface ItemProps {
  children: ReactNode;
  className?: string;
  onSelect?: () => void;
  highlight?: boolean;
}

export default function Item({ children, onSelect, highlight = false }: ItemProps) {
  return (
    <Button
      onClick={onSelect}
      data-highlighted={highlight}
    >
      {children}
    </Button>
  );
}