import { describe, expect, it } from "vitest";
import {
  decodeValue,
  encodeValue,
  fileNameToKey,
  keyToFileName,
} from "./offline-kv";
import { keptBy, keptPageIds, type KeepChoices } from "./offline-keep";
import type { Page } from "src/types";

// The desktop app keeps offline copies as files (offline-kv.ts). A key must
// come back from its file name exactly, and a value from its bytes, or a
// page copy (or its unsent edits) would be lost or mixed up.

describe("offline files: key ↔ file name", () => {
  const keys = [
    "doc:5f1c9a2e-0d1b-4c4e-9a77-1e2f3a4b5c6d:page-123",
    "dirty:person:page",
    "react-query",
    "seen:a:b",
    "clé:ünïcødé:日本語",
  ];

  it("round-trips every key", () => {
    for (const key of keys) {
      expect(fileNameToKey(keyToFileName(key))).toBe(key);
    }
  });

  it('makes names every system accepts (no : / \\ * ? " < > |)', () => {
    for (const key of keys) {
      expect(keyToFileName(key)).toMatch(/^[A-Za-z0-9_-]+\.v$/);
    }
  });

  it("ignores other files in the folder", () => {
    expect(fileNameToKey(".moved-from-browser")).toBeNull();
    expect(fileNameToKey("notes.txt")).toBeNull();
  });
});

describe("offline files: value ↔ bytes", () => {
  it("keeps a page's bytes exactly", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128, 0, 7]);
    const back = decodeValue(encodeValue(bytes));
    expect(back).toBeInstanceOf(Uint8Array);
    expect(Array.from(back as Uint8Array)).toEqual(Array.from(bytes));
  });

  it("keeps strings, numbers and booleans with their type", () => {
    for (const v of ["saved cache", 1730000000000, true, false, ""]) {
      expect(decodeValue(encodeValue(v))).toStrictEqual(v);
    }
  });

  it("an empty or unknown file reads as nothing", () => {
    expect(decodeValue(new Uint8Array())).toBeUndefined();
    expect(decodeValue(new Uint8Array([9, 1, 2]))).toBeUndefined();
  });
});

describe("keep the whole workspace offline", () => {
  const page = (id: string, extra: Partial<Page> = {}) =>
    ({
      id,
      workspaceId: "w1",
      teamspaceId: null,
      category: "Private",
      deletedAt: null,
      ...extra,
    }) as unknown as Page;
  const choices = (c: Partial<KeepChoices>): KeepChoices => ({
    pages: [],
    teamspaces: [],
    favorites: false,
    workspaces: [],
    ...c,
  });

  it("keeps every page of a kept workspace, and only that workspace", () => {
    const pages = [
      page("a"),
      page("b", { teamspaceId: "ts1" }),
      page("ts1", { teamspaceId: "ts1" }),
      page("other", { workspaceId: "w2" }),
      page("trashed", { deletedAt: 1 } as Partial<Page>),
    ];
    expect(keptPageIds(pages, choices({ workspaces: ["w1"] })).sort()).toEqual([
      "a",
      "b",
      "ts1",
    ]);
  });

  it("says why a page is kept, the closest reason first", () => {
    const c = choices({ workspaces: ["w1"], pages: ["a"] });
    expect(keptBy(page("a"), c)).toBe("page");
    expect(keptBy(page("z"), c)).toBe("workspace");
    expect(keptBy(page("ts1", { teamspaceId: "ts1" }), c)).toBe("workspace");
    expect(keptBy(page("z", { workspaceId: "w2" }), c)).toBeNull();
  });

  it("saved choices from before this setting still read", () => {
    expect(keptPageIds([page("a")], choices({}))).toEqual([]);
  });
});
