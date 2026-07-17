import type { PageCover } from "src/types";

export type CalloutAttrs = Pick<PageCover, "color" | "iconName" | "target"> & {
  backgroundColor?: string | null; // add
  showIcon?: boolean; // add
  bordered?: boolean;
};
