import type { FC, ReactNode } from "react";
import Content from "./components/Content";
import Option from "./components/Option";
import Trigger from "./components/Trigger";

export type SelectComponent = FC<{children: ReactNode}> & {
  Content: typeof Content;
  Option: typeof Option;
  Trigger: typeof Trigger;
}