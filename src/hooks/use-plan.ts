import { useQuery } from "@tanstack/react-query";
import { fetchPlanLimits } from "src/api/plan-limits";
import { useCurrentWorkspace } from "./use-workspaces";
import type { PlanLimits, WorkspacePlan } from "src/types";

const planLimitsQueryKey = ["planLimits"] as const;

/**
 * The current workspace's plan and its limits, resolved from one shared place.
 * Every "can I add another X?" check in the UI should read from here, so
 * limits live in exactly one spot instead of being duplicated per feature.
 */
export function usePlan() {
  const { workspace } = useCurrentWorkspace();
  const plan: WorkspacePlan = workspace?.plan ?? "free";

  const { data: allLimits } = useQuery({
    queryKey: planLimitsQueryKey,
    queryFn: fetchPlanLimits,
    staleTime: Infinity, // limits change rarely; no need to refetch constantly
  });

  const limits: PlanLimits | null =
    allLimits?.find((l) => l.plan === plan) ?? null;

  return {
    plan,
    limits,
    isPro: plan === "pro",
    // Convenience: null limit = unlimited = always allowed.
    canHaveMore: (current: number, limit: number | null) =>
      limit == null || current < limit,
  };
}
