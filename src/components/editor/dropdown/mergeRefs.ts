export function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;

      if (typeof ref === 'function') {
        ref(node);
      } else {
        // @ts-expect-error – intentional null → undefined bridge
        ref.current = node ?? undefined;
      }
    }
  };
}
