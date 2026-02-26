import type { PropsWithChildren } from "react";
import { Button } from "../../../Components";

interface ButtonProps {
  children: PropsWithChildren['children'];
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function BubbleButton({
  children,
  active = false,
  onClick,
  //className = 'bubble-button'
}: ButtonProps) {
  return (
    // <span
    //   onMouseDown={(e) => {
    //     e.preventDefault(); // keep editor focus
    //     onClick?.()
    //   }}
    //   className={`${className} ${active ? 'active' : ''}`}
    // >
    //   {children}
    // </span>
    <Button
      data-active-item={active ? "true" : "false"}
      disabled={false}
      // style={{
      //   background: 'transparent'
      // }}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick?.()
      }}
    >
      {children}
    </Button>
  );
}

