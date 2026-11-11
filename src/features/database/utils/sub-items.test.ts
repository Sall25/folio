import { describe, expect, it } from "vitest";
import type { DatabaseProperty, Page } from "src/types";
import { layoutSubItems, subItemPair } from "./sub-items";

const row = (id: string, parent?: string): Page =>
  ({ id, title: id, values: parent ? { P: [parent] } : {} }) as unknown as Page;

// Home ─ Banner ─ Photo
//      └ Menu
// Agenda
const all = [
  row("home"),
  row("banner", "home"),
  row("photo", "banner"),
  row("menu", "home"),
  row("agenda"),
];
const ids = (rows: Page[]) => rows.map((r) => r.id);

describe("sub-items", () => {
  it("finds the pair by its stored side", () => {
    const props = [
      { id: "P", name: "Parent", config: { type: "relation", targetSourceId: "s", showOnTarget: true, mirrorPropertyId: "C", subItems: true } },
      { id: "C", name: "Sub-items", config: { type: "relation", targetSourceId: "s", showOnTarget: false, mirrorPropertyId: "P" } },
    ] as DatabaseProperty[];
    const pair = subItemPair(props, "s");
    expect(pair?.parent.id).toBe("P");
    expect(pair?.children?.id).toBe("C");
    expect(subItemPair(props, "other")).toBeNull();
  });

  it("nests opened rows under their parent, at any depth", () => {
    const { rows, info } = layoutSubItems(all, all, "P", undefined, { home: true, banner: true }, true);
    expect(ids(rows)).toEqual(["home", "banner", "photo", "menu", "agenda"]);
    expect(info.photo.depth).toBe(2);
    expect(info.home.childCount).toBe(2);
  });

  it("hides what's under a closed row", () => {
    const { rows } = layoutSubItems(all, all, "P", undefined, {}, true);
    expect(ids(rows)).toEqual(["home", "agenda"]);
  });

  it("keeps a match's parents when filters apply at every level", () => {
    const { rows } = layoutSubItems(all, [all[2]], "P", { expanded: true }, {}, true);
    expect(ids(rows)).toEqual(["home", "banner", "photo"]);
  });

  it("filters only the top level when asked, showing all under it", () => {
    const { rows } = layoutSubItems(all, [all[0]], "P", { filters: "top", expanded: true }, {}, true);
    expect(ids(rows)).toEqual(["home", "banner", "photo", "menu"]);
  });

  it("shows every row on its own, or the top level only", () => {
    expect(ids(layoutSubItems(all, all, "P", { display: "flat" }, {}, true).rows)).toEqual(ids(all));
    expect(ids(layoutSubItems(all, all, "P", { display: "top" }, {}, true).rows)).toEqual(["home", "agenda"]);
    // Views that don't nest (board, gallery) show the top level.
    expect(ids(layoutSubItems(all, all, "P", undefined, {}, false).rows)).toEqual(["home", "agenda"]);
  });

  it("survives a loop of parents", () => {
    const loop = [row("a", "b"), row("b", "a")];
    const { rows } = layoutSubItems(loop, loop, "P", { expanded: true }, {}, true);
    expect(ids(rows).sort()).toEqual(["a", "b"]);
  });
});
