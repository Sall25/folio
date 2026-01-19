export function escapeAttr(value: string) {
  return value.replace(/"/g, '&quot;');
}
