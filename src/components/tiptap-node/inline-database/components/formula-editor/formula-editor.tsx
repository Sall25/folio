import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { useState, useRef, useMemo } from "react";
import type { DatabaseProperty, ID, ConfigOf } from "src/types";
import { useDatabaseContext } from "../../nodes/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { resolveFormulaValues } from "./resolve-formula-values";
import { validateFormula } from "./formula-evaluator";
import FormulaBar, { type FormulaBarHandle } from "./formula-bar";
import PropertiesPanel from "./properties-panel";
import PropertyDetail from "./property-detail";
import {
  Card,
  CardBody,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { usePagesBase } from "src/hooks/use-pages";

interface FormulaEditorProps {
  propertyId: ID;
  properties: DatabaseProperty[];
  onDone: () => void;
}

export default function FormulaEditor({
  propertyId,
  properties,
  onDone,
}: FormulaEditorProps) {
  const { db, attrs } = useDatabaseContext();
  const { source, setCellValue } = useDataSource(attrs.sourceId);
  const { data: pages } = usePagesBase((pages) =>
    pages.filter((p) => p.sourceId === source?.id),
  );

  const formulaProperty = properties.find((p) => p.id === propertyId);
  const initialExpression =
    formulaProperty?.config.type === "formula"
      ? formulaProperty.config.expression
      : "";

  const [formula, setFormula] = useState(initialExpression);
  const [selectedProperty, setSelectedProperty] =
    useState<DatabaseProperty | null>(properties[0] ?? null);

  const formulaBarRef = useRef<FormulaBarHandle>(null);

  // Validate the current expression (parse-only — see validateFormula). Warns
  // on malformed syntax without blocking save. Recomputes only when the formula
  // changes; parsing a short string is cheap.
  const error = useMemo(
    () => validateFormula(formula, { properties, cellValues: {} }),
    [formula, properties],
  );

  function handleDone() {
    const newConfig = {
      type: "formula",
      expression: formula,
    } satisfies ConfigOf<"formula">;

    const updatedProperties = properties.map((p) =>
      p.id === propertyId ? { ...p, config: newConfig } : p,
    );

    db.updateProperty(propertyId, { config: newConfig });
    if (!source) return;

    resolveFormulaValues(pages ?? [], updatedProperties, setCellValue);
    onDone();
  }

  // Focus-gated inside FormulaBar: only inserts when the editor has focus.
  function handleInsertSnippet(snippet: string) {
    formulaBarRef.current?.insertSnippet(snippet);
  }

  return (
    <Card className="formula-editor" style={{ minWidth: 600 }}>
      <CardHeader>
        <CardItemGroup style={{ width: "100%" }}>
          <FormulaBar
            ref={formulaBarRef}
            formula={formula}
            properties={properties}
            onChange={setFormula}
            onDone={handleDone}
          />
          {error && (
            <div className="formula-error" role="alert">
              <DynamicIcon
                name="warning"
                size={13}
                filled={false}
                className="formula-error__icon"
              />
              <span>{error}</span>
            </div>
          )}
        </CardItemGroup>
      </CardHeader>
      <CardBody style={{ width: "100%", padding: "6px 10px" }}>
        {/* Stacked, full width: properties flow into a multi-column grid on
            top, the selected property's detail/examples sit below with room
            for long formula strings. Replaces the old cramped 1fr/3fr split. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PropertiesPanel
            properties={properties}
            selectedPropertyId={selectedProperty?.id}
            onSelectProperty={setSelectedProperty}
            onInsertProperty={(prop) =>
              handleInsertSnippet(`prop("${prop.name}")`)
            }
          />
          <Separator style={{ height: 0.5 }} orientation="horizontal" />
          <PropertyDetail
            property={selectedProperty}
            properties={properties}
            onInsertSnippet={handleInsertSnippet}
          />
        </div>
      </CardBody>
    </Card>
  );
}
