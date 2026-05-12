import { useState } from "react";
import type { DatabaseProperty, ID, ConfigOf } from "../../types/types";
import { useDatabaseContext } from "../../nodes/database-context";
import { resolveFormulaValues } from "./resolve-formula-values";
import FormulaBar from "./formula-bar";
import PropertiesPanel from "./properties-panel";
import PropertyDetail from "./property-detail";
import {
  Card,
  CardBody,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

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
  const { db, editor, attrs } = useDatabaseContext();

  const formulaProperty = properties.find((p) => p.id === propertyId);
  const initialExpression =
    formulaProperty?.config.type === "formula"
      ? formulaProperty.config.expression
      : "";

  const [formula, setFormula] = useState(initialExpression);
  const [selectedProperty, setSelectedProperty] =
    useState<DatabaseProperty | null>(properties[0] ?? null);

  function handleDone() {
    const newConfig = {
      type: "formula",
      expression: formula,
    } satisfies ConfigOf<"formula">;

    // Build updated properties locally so resolveFormulaValues sees the new
    // expression immediately — attrs.properties is still stale at this point
    const updatedProperties = properties.map((p) =>
      p.id === propertyId ? { ...p, config: newConfig } : p,
    );

    db.updateProperty(propertyId, { config: newConfig });
    resolveFormulaValues(editor, attrs.id, updatedProperties);
    onDone();
  }

  function handleInsertSnippet(snippet: string) {
    setFormula((f) => f + snippet);
  }

  return (
    <Card className="formula-editor" style={{ minWidth: 600 }}>
      <CardHeader>
        <FormulaBar
          formula={formula}
          properties={properties}
          onChange={setFormula}
          onDone={handleDone}
        />
      </CardHeader>
      <CardBody style={{ width: "100%" }}>
        <CardItemGroup orientation="horizontal">
          <PropertiesPanel
            properties={properties}
            selectedPropertyId={selectedProperty?.id}
            onSelectProperty={setSelectedProperty}
          />
          <Spacer orientation="horizontal" />
          <PropertyDetail
            property={selectedProperty}
            onInsertSnippet={handleInsertSnippet}
          />
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
