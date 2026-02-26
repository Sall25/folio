import type { FC, ReactNode } from "react";
import type Item from "./Item";
import type Content from "./Content";
import type Trigger from "./Trigger";

export type NavigationComponent = FC<{ children: ReactNode, className?: string }> & ({
  Item: typeof Item;
  Content: typeof Content;
  Trigger: typeof Trigger;
});