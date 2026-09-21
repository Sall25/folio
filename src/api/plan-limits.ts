import type { PlanLimits, WorkspacePlan } from "src/types";
import { http } from "./client";

// http()'s snake→camel shim maps max_members → maxMembers etc. automatically,
// same as every other table.
export const fetchPlanLimits = () => http<PlanLimits[]>("/plan_limits");

export const fetchPlanLimitsFor = (plan: WorkspacePlan) =>
  http<PlanLimits[]>(`/plan_limits?plan=eq.${plan}`).then(
    (rows) => rows[0] ?? null,
  );
