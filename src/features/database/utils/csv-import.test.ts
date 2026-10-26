import { describe, expect, it } from "vitest";
import type { DatabaseProperty, Person } from "src/types";
import {
  detectDateOrder,
  guessColumns,
  guessType,
  parseCsv,
  parseDateText,
  parseNumberText,
  planImport,
} from "./csv-import";

const props: DatabaseProperty[] = [
  { id: "title", name: "Name", config: { type: "title" } },
  {
    id: "status",
    name: "Status",
    config: {
      type: "status",
      groups: [
        {
          id: "todo",
          label: "To do",
          items: [
            { id: "ns", name: "Not started", color: "gray", isDefault: true },
          ],
        },
        {
          id: "done",
          label: "Done",
          items: [{ id: "d", name: "Done", color: "green" }],
        },
      ],
    },
  },
  {
    id: "type",
    name: "Type",
    config: {
      type: "select",
      options: [{ id: "exam", label: "Exam", color: "orange" }],
    },
  },
  {
    id: "due",
    name: "Due",
    config: {
      type: "date",
      format: "full",
      timeFormat: "12h",
      includeTime: false,
    },
  },
  {
    id: "who",
    name: "Assignee",
    config: {
      type: "person",
      limit: "multiple",
      default: "none",
      notifications: {},
    },
  } as unknown as DatabaseProperty,
];

const people = [
  {
    id: "u1",
    name: "Souleymane Sall",
    email: "s.sall@uvs.sn",
    avatarUrl: null,
  },
] as Person[];

describe("parseCsv", () => {
  it("reads French Excel files (semicolons, BOM, CRLF)", () => {
    const t = parseCsv(
      '\uFEFFNom;Points\r\n"Essai; final";12,5\r\n\r\nQuiz;8\r\n',
    );
    expect(t.delimiter).toBe(";");
    expect(t.headers).toEqual(["Nom", "Points"]);
    expect(t.rows).toEqual([
      ["Essai; final", "12,5"],
      ["Quiz", "8"],
    ]);
  });

  it("handles quotes, doubled quotes and line breaks inside a cell", () => {
    const t = parseCsv('a,b\n"say ""hi""","line 1\nline 2"\nshort\n');
    expect(t.rows).toEqual([
      ['say "hi"', "line 1\nline 2"],
      ["short", ""],
    ]);
  });
});

describe("values", () => {
  it("reads numbers written the French or English way", () => {
    expect(parseNumberText("12,5")).toBe(12.5);
    expect(parseNumberText("1 250,75")).toBe(1250.75);
    expect(parseNumberText("1,250.75")).toBe(1250.75);
    expect(parseNumberText("€30")).toBe(30);
    expect(parseNumberText("ten")).toBeNull();
  });

  it("finds the order of a column's dates", () => {
    expect(detectDateOrder(["2026-10-19"], "mdy")).toBe("ymd");
    expect(detectDateOrder(["03/04/2026", "21/09/2026"], "mdy")).toBe("dmy");
    expect(detectDateOrder(["03/04/2026", "09/21/2026"], "dmy")).toBe("mdy");
    expect(detectDateOrder(["03/04/2026"], "dmy")).toBe("dmy");
  });

  it("turns a date into that local day", () => {
    const iso = parseDateText("19/10/2026", "dmy")!;
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 19]);
    expect(parseDateText("31/02/2026", "dmy")).toBeNull();
  });

  it("guesses a new column's type", () => {
    expect(guessType(["10", "25", ""])).toBe("number");
    expect(guessType(["oui", "non", "oui"])).toBe("checkbox");
    expect(guessType(["21/09/2026", "19/10/2026"])).toBe("date");
    expect(guessType(["a@b.co", "c@d.org"])).toBe("email");
    expect(guessType(["Exam", "Homework", "Exam", "Exam"])).toBe("select");
    expect(guessType(["Graded, Online", "Graded", "Online"])).toBe(
      "multi_select",
    );
    expect(guessType(["Read chapter 3", "Write the intro"])).toBe("text");
  });
});

describe("planning an import", () => {
  const table = parseCsv(
    [
      "Assignment;Statut;Type;Due;Points;Assignee",
      "Vectors;Done;Reading;21/09/2026;10;s.sall@uvs.sn",
      "Essay;Fini;Exam;19/10/2026;abc;Nobody",
      "Loops;Fini;Exam;12/10/2026;15;",
    ].join("\n"),
  );

  it("matches columns by name and guesses the rest", () => {
    const targets = guessColumns(table, props);
    expect(targets[0]).toEqual({ kind: "title" }); // no "Name" column: the first one
    expect(targets[2]).toEqual({ kind: "property", propertyId: "type" });
    expect(targets[3]).toEqual({ kind: "property", propertyId: "due" });
    expect(targets[4]).toMatchObject({ kind: "new", type: "text" }); // "abc" isn't a number
    expect(targets[5]).toEqual({ kind: "property", propertyId: "who" });
  });

  it("adds options and properties, and reports what it couldn't read", () => {
    const targets = guessColumns(table, props);
    targets[1] = { kind: "property", propertyId: "status" };
    targets[4] = { kind: "new", type: "number", name: "Points" };
    const plan = planImport(table, targets, props, {
      people,
      dateFallback: "dmy",
    });

    const status = plan.properties.find((p) => p.id === "status")!;
    const names =
      status.config.type === "status"
        ? status.config.groups.flatMap((g) => g.items.map((i) => i.name))
        : [];
    expect(names).toContain("Fini");
    expect(plan.newOptions[1]).toBe(1); // "Fini" (Done exists)
    expect(plan.newOptions[2]).toBe(1); // "Reading" (Exam exists)

    const points = plan.properties.find((p) => p.name === "Points")!;
    expect(points.config.type).toBe("number");
    expect(plan.rows.map((r) => r.values[points.id])).toEqual([
      10,
      undefined,
      15,
    ]);
    expect(plan.skippedCells[4]).toBe(1);

    expect(plan.rows[0].title).toBe("Vectors");
    expect(plan.rows[0].values.who).toEqual([
      { id: "u1", name: "Souleymane Sall" },
    ]);
    expect(plan.unknownPeople[5]).toBe(1);
  });
});
