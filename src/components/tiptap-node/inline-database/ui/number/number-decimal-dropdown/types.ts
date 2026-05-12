export const DECIMAL_OPTIONS = [0, 1, 2, 3, 4] as const;
export type NumberDecimal = (typeof DECIMAL_OPTIONS)[number];
