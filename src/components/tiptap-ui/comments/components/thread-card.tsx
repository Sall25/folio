import type React from "react";
import { useCallback, useEffect, useRef } from "react";

interface ThreadCardProps {
  id: string;
  active: boolean;
  open: boolean;
  children: React.ReactNode;
  onClick: ((threadId: string) => unknown) | null;
  onClickOutside: () => unknown;
}

export const ThreadCard = ({
  id,
  active,
  open,
  children,
  onClick,
  onClickOutside,
}: ThreadCardProps) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(id);
    }
  }, [id, onClick]);

  useEffect(() => {
    if (!active || !onClickOutside) {
      return () => null;
    }

    const pointerHandler = (event: MouseEvent | TouchEvent) => {
      if (!cardRef.current) {
        return;
      }

      if (!cardRef.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", pointerHandler, true);
    document.addEventListener("touchstart", pointerHandler, true);

    return () => {
      document.removeEventListener("mousedown", pointerHandler, true);
      document.removeEventListener("touchstart", pointerHandler, true);
    };
  }, [active, onClickOutside]);

  return (
    <div
      ref={cardRef}
      className={`thread${open ? " is-open" : ""}${active ? " is-active" : ""}`}
      onClick={handleClick}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};
