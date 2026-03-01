import type { ReactNode } from "react";
import { useNavigation } from "./context";
import { CardItemGroup } from "../../card";

interface TriggerProps {
  children: ReactNode;
  className?: string;
}

export default function Trigger({ children, className }: TriggerProps) {
  const { setOpen, open } = useNavigation();

  return (
    // <button
    //   style={{
    //     position: 'fixed',
    //     right: 0,
    //     top: 0,
    //     transform: 'translateY(50%)',
    //     width: '300px',
    //     height: '300px',
    //     background: 'lightpink'
    //   }}
    //   onMouseOver={(e) => {
    //     e.preventDefault();
    //     setOpen(true)
    //   }}
    //   className={className}
    // >
    //   {children}
    // </button>
    <CardItemGroup
      orientation="vertical"
      onMouseOver={(e) => {
        e.preventDefault()
        setOpen(true)
      }}

      className={className}
      style={{
        display: open ? 'none' : 'flex',
        pointerEvents: 'auto',
        zIndex: 80
      }}
    >
      {children}
    </CardItemGroup>
  );
}