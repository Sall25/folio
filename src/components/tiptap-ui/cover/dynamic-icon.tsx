import type { LucideProps } from "lucide-react";
import { createElement, type FunctionComponent } from "react";
import { ICON_LIST } from "./data/icon-list";

const iconMap = new Map(ICON_LIST.map((e) => [e.name, e.icon]));

export const DynamicIcon = ({
  name,
  ...props
}: { name: string } & LucideProps) => {
  const Icon = iconMap.get(name);
  if (!Icon) return null;
  return createElement(Icon as FunctionComponent, props);
};
