import { type CSSProperties, type ReactNode } from "react";

export default function DropdownItem({
  active,
  style,
  onSelect,
  children,

}: {
  active?: boolean;
  style?: CSSProperties;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        px-2 py-1.5 rounded text-sm cursor-pointer
        transition
        ${active
          ? 'bg-neutral-200 dark:bg-neutral-900 text-cyan-500 font-medium'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}
      `}
      style={style}
    >
      {children}
    </div>
  );
}
