import type { ReactNode } from "react";

interface GroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export default function Group({ children, label, className = "flex flex-col gap-2 px-1 py-1" }: GroupProps) {
  return (
    <>
      {label && (
        <div className="flex flex-col items-center gap-1.5">
          <span>{label}</span>
          <div className={className}>
            {children}
          </div>
        </div>
      )}
      {
        !label && (
          <div className={className}>
            {children}
          </div>
        )
      }
    </>
  );
}