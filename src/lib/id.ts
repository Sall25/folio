export const newId = (): string =>
  crypto.randomUUID?.() ??
  `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
