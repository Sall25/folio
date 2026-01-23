import { useEffect, type ReactNode } from "react";
import { useSlotContext } from "../context";

interface SlotProps {
  name: string;
  children: ReactNode;
}

export default function Slot({ name, children }: SlotProps) {
  const { register } = useSlotContext();
  useEffect(() => {
    register(name, children);
  }, [name, children, register]);

  return null;
}