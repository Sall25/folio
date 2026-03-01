import type { ReactNode } from "react";
import { Button } from "../../button";

import './item.scss'

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
      className="doc-menu-item"
      onClick={onSelect}
      data-menu-item-highlighted={highlight}
      data-level={level}
      style={{
        paddingLeft: `${(level - 1) * indentStep + 12}px`,
        background: 'transparent',

      }}
    >
      {children}
    </Button>
  );
}