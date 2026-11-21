import { describe, expect, it } from "vitest";
import type { Page } from "src/types";
import type { FilterRule } from "src/types/filter-types";
import { recordMatchesRule } from "./apply-filters";

process.env.TZ = "America/New_York";

describe("date filters", () => {
  it("match the picked day west of UTC", () => {
    // A date cell stores the picked day's local midnight as ISO.
    const mar14 = new Date(2026, 2, 14).toISOString();
    const record = { values: { due: mar14, last: mar14 } } as unknown as Page;
    const rule = (propertyId: string, propertyType: string, operator: string) =>
      ({
        id: "r",
        propertyId,
        propertyType,
        operator,
        value: "2026-03-14",
      }) as FilterRule;
    expect(recordMatchesRule(record, rule("due", "date", "is"))).toBe(true);
    expect(recordMatchesRule(record, rule("last", "rollup", "equals"))).toBe(
      true,
    );
  });
});
