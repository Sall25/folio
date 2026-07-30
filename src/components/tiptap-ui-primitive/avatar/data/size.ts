import type { AvatarSize } from "../types";

export const SIZE: Record<
  AvatarSize,
  { box: number; font: number; dot: number }
> = {
  xs: { box: 20, font: 8, dot: 6 },
  sm: { box: 24, font: 10, dot: 7 },
  md: { box: 40, font: 14, dot: 11 },
  lg: { box: 48, font: 17, dot: 13 },
  xl: { box: 64, font: 22, dot: 16 },
};
