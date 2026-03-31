import type { AvatarSize } from "../types";

export const SIZE: Record<AvatarSize, { box: number, font: number, dot: number }> = {
  xs: { box: 24, font: 9, dot: 7 },
  sm: { box: 32, font: 12, dot: 9 },
  md: { box: 40, font: 14, dot: 11 },
  lg: { box: 48, font: 17, dot: 13 },
  xl: { box: 64, font: 22, dot: 16 }
}