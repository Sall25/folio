import type { DatabaseProperty, PropertyType } from "../../types/types";
import {
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Copy } from "lucide-react";

// ─── formula return types ─────────────────────────────────────────────────────

const FORMULA_RETURN_TYPE: Record<PropertyType, string> = {
  title: "Text",
  text: "Text",
  number: "Number",
  checkbox: "Boolean",
  select: "Text",
  multi_select: "Text (list)",
  status: "Text",
  date: "Date",
  person: "Person (list)",
  url: "Text",
  email: "Text",
  phone: "Text",
  formula: "Depends on expression",
  relation: "Page (list)",
  rollup: "Number, date, or list",
  created_time: "Date",
  created_by: "Person",
  edited_time: "Date",
  edited_by: "Person",
};

// ─── snippets per type ────────────────────────────────────────────────────────

function getSnippets(prop: DatabaseProperty): string[] {
  const n = prop.name;
  const c = prop.config;

  switch (c.type) {
    case "title":
    case "text":
      return [
        `prop("${n}")`,
        `prop("${n}").length()`,
        `prop("${n}").contains("keyword")`,
        `prop("${n}").replaceAll("old", "new")`,
      ];

    case "number":
      return [
        `prop("${n}")`,
        `prop("${n}") / 2`,
        `round(prop("${n}"), 2)`,
        `pi() * prop("${n}") ^ 2`,
      ];

    case "checkbox":
      return [
        `prop("${n}")`,
        `not prop("${n}")`,
        `prop("${n}") == true ? "Complete" : "Incomplete"`,
      ];

    case "select":
    case "status":
      return [
        `prop("${n}")`,
        `prop("${n}") == "Option"`,
        `if(prop("${n}") == "Option", "match", "no match")`,
      ];

    case "multi_select":
      return [
        `prop("${n}").length()`,
        `prop("${n}").includes("Tag")`,
        `prop("${n}").filter(current == "Tag")`,
      ];

    case "date":
    case "created_time":
    case "edited_time":
      return [
        `prop("${n}") > now()`,
        `dateBetween(prop("${n}"), now(), "days")`,
        `formatDate(prop("${n}"), "MMMM D, YYYY")`,
        `dateAdd(prop("${n}"), 7, "days")`,
      ];

    case "person":
    case "created_by":
    case "edited_by":
      return [
        `prop("${n}")`,
        `prop("${n}").at(0).name()`,
        `prop("${n}").map(current.email()).join(", ")`,
      ];

    case "url":
    case "email":
    case "phone":
      return [
        `prop("${n}")`,
        `!empty(prop("${n}"))`,
        ...(c.type === "phone" ? [`link("Call", "tel:" + prop("${n}"))`] : []),
        ...(c.type === "email"
          ? [`link("Email", "mailto:" + prop("${n}"))`]
          : []),
      ];

    case "relation":
      return [
        `prop("${n}").length()`,
        `prop("${n}").filter(current.prop("Status") != "Done")`,
      ];

    case "rollup":
      return [`prop("${n}")`, `prop("${n}").length()`, `prop("${n}") * 12`];

    case "formula":
      return [`prop("${n}")`];
  }
}

// ─── component ────────────────────────────────────────────────────────────────

interface PropertyDetailProps {
  property: DatabaseProperty | null;
  onInsertSnippet?: (snippet: string) => void;
}

export default function PropertyDetail({
  property,
  onInsertSnippet,
}: PropertyDetailProps) {
  if (!property) return null;

  const { config } = property;
  const snippets = getSnippets(property);
  const returnType = FORMULA_RETURN_TYPE[config.type];

  return (
    <CardItemGroup style={{ minWidth: 450 }}>
      <CardItemGroup>
        <p style={{ fontWeight: 500, fontSize: 13 }}>{property.name}</p>
        <p style={{ fontSize: 12, opacity: 0.5 }}>Returns {returnType}</p>
      </CardItemGroup>

      <Separator />

      <CardItemGroup orientation="vertical">
        <CardGroupLabel>Examples</CardGroupLabel>
        {snippets.map((snippet) => (
          <Button
            key={snippet}
            variant="ghost"
            onClick={() => onInsertSnippet?.(snippet)}
          >
            <code
              className="tiptap-button-text"
              style={{ fontFamily: "monospace", fontSize: 12 }}
            >
              {snippet}
            </code>
            <Copy className="tiptap-button-icon" />
          </Button>
        ))}
      </CardItemGroup>
    </CardItemGroup>
  );
}
