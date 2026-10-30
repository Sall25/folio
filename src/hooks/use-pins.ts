import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPin, deletePin, fetchPins, type Pin } from "src/api/pins";
import { useCurrentPerson } from "src/hooks/use-session";

export const pinsKey = ["pins"] as const;

/** Every pin you can see (yours and your teamspaces'), in rail order. */
export function usePins() {
  const { person } = useCurrentPerson();
  return useQuery({
    queryKey: pinsKey,
    queryFn: fetchPins,
    enabled: !!person,
  });
}

export function useCreatePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPin,
    onSuccess: (pin) =>
      qc.setQueryData<Pin[]>(pinsKey, (old) => [...(old ?? []), pin]),
    onSettled: () => qc.invalidateQueries({ queryKey: pinsKey }),
  });
}

export function useDeletePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePin,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: pinsKey });
      const previous = qc.getQueryData<Pin[]>(pinsKey);
      qc.setQueryData<Pin[]>(pinsKey, (old) => old?.filter((p) => p.id !== id));
      return { previous };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(pinsKey, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: pinsKey }),
  });
}
