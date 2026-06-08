import { useState, useRef, useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import type { DatabaseProperty, ID, ConfigOf } from "../../types/types";
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
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";

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

    resolveFormulaValues(source.records, updatedProperties, setCellValue);
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
              <TriangleAlert size={13} className="formula-error__icon" />
              <span>{error}</span>
            </div>
          )}
        </CardItemGroup>
      </CardHeader>
      <CardBody style={{ width: "100%", padding: "6px 10px" }}>
        <Grid columns="1fr 3fr" gap={5}>
          <GridRow>
            <GridCell style={{ alignItems: "baseline" }}>
              <PropertiesPanel
                properties={properties}
                selectedPropertyId={selectedProperty?.id}
                onSelectProperty={setSelectedProperty}
                onInsertProperty={(prop) =>
                  handleInsertSnippet(`prop("${prop.name}")`)
                }
              />
            </GridCell>
            <GridCell style={{ alignItems: "baseline" }}>
              <PropertyDetail
                property={selectedProperty}
                properties={properties}
                onInsertSnippet={handleInsertSnippet}
              />
            </GridCell>
          </GridRow>
        </Grid>
      </CardBody>
    </Card>
  );
}
