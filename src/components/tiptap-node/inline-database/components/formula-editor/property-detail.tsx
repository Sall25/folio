import type { ReactNode } from "react";
import type { DatabaseProperty, PropertyType } from "src/types";
import {
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";

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

// ─── prop("Name") -> pill rendering (display only) ──────────────────────────
// Renders a snippet STRING as React nodes, replacing each prop("...") with a
// pill (icon + name). This is purely visual: the raw string is still what gets
// inserted. Names that don't resolve to a current property stay as plain text.

function PropPill({ property }: { property: DatabaseProperty }) {
  return (
    <span className="formula-prop-pill">
      <DynamicIcon
        name={PROPERTY_TYPE_ICONS[property.config.type]}
        size={12}
        filled={false}
        className="formula-prop-pill__icon"
      />
      <span className="formula-prop-pill__name">{property.name}</span>
    </span>
  );
}

function renderSnippet(
  snippet: string,
  properties: DatabaseProperty[],
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /prop\(\s*(["'])(.*?)\1\s*\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(snippet))) {
    const name = m[2];
    const prop = properties.find((p) => p.name === name);

    // text before this match
    if (m.index > last) {
      out.push(<span key={key++}>{snippet.slice(last, m.index)}</span>);
    }

    if (prop) {
      out.push(<PropPill key={key++} property={prop} />);
    } else {
      // unresolved -> leave the raw prop("...") text
      out.push(<span key={key++}>{m[0]}</span>);
    }

    last = m.index + m[0].length;
  }

  // trailing text
  if (last < snippet.length) {
    out.push(<span key={key++}>{snippet.slice(last)}</span>);
  }

  return out;
}

// ─── component ────────────────────────────────────────────────────────────────

interface PropertyDetailProps {
  property: DatabaseProperty | null;
  // Full property list so prop("Other") references inside a snippet (e.g.
  // relation's prop("Status")) can also resolve to a pill. Falls back to just
  // the focused property if not provided.
  properties?: DatabaseProperty[];
  onInsertSnippet?: (snippet: string) => void;
}

export default function PropertyDetail({
  property,
  properties,
  onInsertSnippet,
}: PropertyDetailProps) {
  if (!property) return null;

  const { config } = property;
  const snippets = getSnippets(property);
  const returnType = FORMULA_RETURN_TYPE[config.type];
  const resolveList = properties ?? [property];

  return (
    <CardItemGroup style={{ minWidth: 500 }}>
      <CardItemGroup>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{property.name}</span>
        <p style={{ fontSize: 12, opacity: 0.5 }}>Returns {returnType}</p>
      </CardItemGroup>

      <Separator style={{ height: 0.5 }} orientation="horizontal" />

      <CardItemGroup orientation="vertical">
        <CardGroupLabel>Examples</CardGroupLabel>
        {snippets.map((snippet) => (
          <Button
            key={snippet}
            variant="ghost"
            style={{ gap: 6 }}
            // Preserve editor focus through the click (mousedown would
            // otherwise blur the editor and skip the focus-gated insert).
            onMouseDown={(e) => e.preventDefault()}
            // Insert the RAW snippet string — the pill is display-only.
            onClick={() => onInsertSnippet?.(snippet)}
          >
            <code
              className="tiptap-button-text formula-snippet"
              style={{ fontFamily: "monospace", fontSize: 12 }}
            >
              {renderSnippet(snippet, resolveList)}
            </code>
            <DynamicIcon name="content_copy" size={14} filled={false} />
          </Button>
        ))}
      </CardItemGroup>
    </CardItemGroup>
  );
}
