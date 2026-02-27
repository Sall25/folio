import type { ReactNode } from "react";
import { Button } from "../../button";

interface ItemProps {
  children: ReactNode;
  className?: string;
  onSelect?: () => void;
  highlight?: boolean;
  level?: number;
}

export default function Item({
  children,
  level = 1,
  onSelect,
  highlight = false,
}: ItemProps) {
  const indentStep = 6; // tweak this to taste

  return (
    <Button
      onClick={onSelect}
      data-highlighted={highlight}
      style={{
        paddingLeft: `${(level - 1) * indentStep + 12}px`,
        background: 'transparent',
        justifyContent: 'flex-start'
      }}
    >
      {children}
    </Button>
  );
}