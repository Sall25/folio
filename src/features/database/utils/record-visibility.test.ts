import { describe, expect, it } from "vitest";
import { showsRecordsAsRows } from "./record-visibility";

// A cell renders its content only once its row reports that it is near the
// screen, and a row reports only if its view is one of these. The two sides
// used to carry the list each, and they came apart: the timeline was added to
// the cells' copy and not to the rows', so every cell in the panel beside the
// grid sat on the empty placeholder waiting for a signal nothing sent.

describe("which views are rows of cells", () => {
  it("counts the three that render cells", () => {
    expect(showsRecordsAsRows("table")).toBe(true);
    expect(showsRecordsAsRows("list")).toBe(true);
    // Its panel is a table view: the same cells, the same columns.
    expect(showsRecordsAsRows("timeline")).toBe(true);
  });

  it("leaves out the views that draw their own content", () => {
    // A card or a bar; the cells' DOM is never mounted there.
    expect(showsRecordsAsRows("board")).toBe(false);
    expect(showsRecordsAsRows("gallery")).toBe(false);
    expect(showsRecordsAsRows("calendar")).toBe(false);
  });

  it("says no before a view is known", () => {
    expect(showsRecordsAsRows(undefined)).toBe(false);
  });
});
