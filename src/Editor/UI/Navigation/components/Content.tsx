import { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigation } from "../context";

interface ContentProps {
  children: ReactNode;
  className?: string;
}

export default function Content({ children, className = 'inline-block' }: ContentProps) {
  const { open, setOpen } = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  return (
    <div
      onMouseLeave={() => setOpen(false)}
      className={clsx(
        className,
        "transition-all duration-1000 ease-in-out transform",
        open ? "opacity-100 scale-105" : "opacity-0 scale-95",
        !visible && "hidden"
      )}
    >
      {children}
    </div>
  );
}
