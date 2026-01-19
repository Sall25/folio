
import { useState, type PropsWithChildren, type ReactNode } from 'react';

export default function Dropdown({
  label,
  children,
}: {
  label: string | PropsWithChildren['children'];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseDown={e => e.preventDefault()} // keep editor focus
        onClick={() => setOpen(v => !v)}
        className="
          px-2 py-1 rounded-md text-sm text-gray-800
          transition dark:shadow-neutral-800
          shadow-2xl
        "
      >
        {label}
      </button>

      {open && (
        <div
          className="
            absolute top-full mt-1 z-50 min-w-40
            bg-white dark:bg-neutral-800
            shadow-2xl dark:shadow-neutral-900 rounded-lg p-1
          "
          onMouseDown={e => e.preventDefault()}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
