/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useCallback, useState } from "react";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { PanelRightOpen } from "lucide-react";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import type { DatabaseAttrs, ListView } from "../types/types";
import { PROPERTY_TYPE_ICONS } from "../types/property-type-meta";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";

import "./database-record-list-view.scss";

// Renders a single cell value as inline text/chip
function InlineCellValue({
  propertyId,
  node,
  attrs,
}: {
  propertyId: string;
  node: import("@tiptap/pm/model").Node;
  attrs: DatabaseAttrs;
}) {
  const prop = attrs.properties.find((p) => p.id === propertyId);
  if (!prop) return null;

  // Find the cell node inside the record for this property
  let cellNode: import("@tiptap/pm/model").Node | null = null;
  node.forEach((child) => {
    if (child.attrs.propertyId === propertyId) cellNode = child;
  });

  if (!cellNode) return null;

  const value = (cellNode as any).attrs.value;
  if (value === null || value === undefined || value === "") return null;

  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];

  let displayValue: string = "";

  switch (prop.config.type) {
    case "checkbox":
      displayValue = value ? "☑" : "☐";
      break;
    case "select":
    case "status":
      displayValue = value?.label ?? "";
      break;
    case "multi_select":
      displayValue = Array.isArray(value)
        ? value.map((v: any) => v.label).join(", ")
        : "";
      break;
    case "date":
    case "created_time":
    case "edited_time":
      displayValue = value
        ? new Date(value).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";
      break;
    default:
      displayValue = String(value);
  }

  if (!displayValue) return null;

  return (
    <span className="db-list-record__prop">
      <Icon size={11} className="db-list-record__prop-icon" />
      <span className="db-list-record__prop-value">{displayValue}</span>
    </span>
  );
}

export function DatabaseRecordListView(props: NodeViewProps) {
  const { node, getPos, editor } = props;

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n;
    }
    return null;
  }, [editor, getPos]);

  const { setPeekPageId } = usePeekPage();
  const { pages } = usePages();
  const [shouldShow, setShouldShow] = useState(false);

  // Find the title cell to get pageId for peek
  let titlePageId: number | null = null;
  node.forEach((child) => {
    if (child.type.name === "titleCell") {
      titlePageId = child.attrs.pageId;
    }
  });

  const page = titlePageId && pages ? findPage(pages, titlePageId) : null;

  const handleOpenPeek = useCallback(() => {
    if (titlePageId) setPeekPageId(titlePageId);
  }, [titlePageId, setPeekPageId]);

  const db = getParentDatabase();
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;

  const activeView = attrs.views.find((v) => v.id === attrs.activeViewId) as
    | ListView
    | undefined;
  const visiblePropertyIds = activeView?.visibleProperties ?? [];

  // Inline properties — exclude title
  const inlineProps = attrs.properties.filter(
    (p) =>
      p.config.type !== "title" &&
      (visiblePropertyIds.length === 0 || visiblePropertyIds.includes(p.id)),
  );

  const gridTemplateColumns = attrs.properties
    .map((p, i) => (i === 0 ? "1fr" : `${p.width ?? 160}px`))
    .join(" ");

  return (
    <NodeViewWrapper
      as="div"
      className="db-list-record"
      onMouseEnter={() => setShouldShow(true)}
      onMouseLeave={() => setShouldShow(false)}
    >
      <CardItemGroup
        className="db-list-record__row"
        style={{ gridTemplateColumns, border: "none" }}
      >
        <NodeViewContent as={"div"} />
      </CardItemGroup>
    </NodeViewWrapper>
  );
}
