import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { DatabaseAttrs } from "src/types";
import { evaluateFormula } from "../components/formula-editor/formula-evaluator";
export const formulaSyncPluginKey = new PluginKey("formulaSync");

export const formulaSyncPlugin = new Plugin({
  key: formulaSyncPluginKey,

  appendTransaction(transactions, _oldState, newState) {
    // Only care about transactions that changed the document
    const docChanged = transactions.some((tr) => tr.docChanged);
    if (!docChanged) return null;

    // Skip transactions that are themselves formula resolutions
    const isFormulaUpdate = transactions.some(
      (tr) =>
        tr.getMeta("addToHistory") === false &&
        tr.getMeta("formulaSync") === true,
    );
    if (isFormulaUpdate) return null;

    // Find all database nodes that have formula properties
    const toResolve: { nodeId: string; attrs: DatabaseAttrs }[] = [];

    newState.doc.descendants((node) => {
      if (node.type.name !== "database") return;
      const attrs = node.attrs as DatabaseAttrs;
      const hasFormulas = attrs.properties.some(
        (p) => p.config.type === "formula",
      );
      if (hasFormulas) {
        toResolve.push({ nodeId: attrs.id, attrs });
      }
    });

    if (!toResolve.length) return null;

    // Build a single transaction that resolves all formula cells
    const { tr } = newState;
    let mutated = false;

    for (const { nodeId, attrs } of toResolve) {
      newState.doc.descendants((dbNode, dbPos) => {
        if (dbNode.type.name !== "database") return;
        if (dbNode.attrs.id !== nodeId) return;

        dbNode.forEach((recordNode, recordOffset) => {
          if (recordNode.type.name !== "databaseRecord") return;

          const recordPos = dbPos + 1 + recordOffset;

          // Build cell value map inline (avoid import cycle)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cellValues: Record<string, any> = {};
          const propById = new Map(attrs.properties.map((p) => [p.id, p]));

          recordNode.forEach((cellNode) => {
            const { propertyId, value } = cellNode.attrs as {
              propertyId: string | null;
              value?: unknown;
            };
            if (!propertyId) return;
            const prop = propById.get(propertyId);
            if (!prop) return;

            if (prop.config.type === "title" || prop.config.type === "text") {
              cellValues[propertyId] = cellNode.textContent;
            } else {
              cellValues[propertyId] = value ?? null;
            }
          });

          // Evaluate formula properties
          const formulaProps = attrs.properties.filter(
            (p) => p.config.type === "formula",
          );

          for (const prop of formulaProps) {
            if (prop.config.type !== "formula") continue;

            const result = evaluateFormula(prop.config.expression, {
              properties: attrs.properties,
              cellValues,
            });

            recordNode.forEach((cellNode, cellOffset) => {
              if (cellNode.type.name !== "formulaCell") return;
              if (cellNode.attrs.propertyId !== prop.id) return;
              if (cellNode.attrs.value === result) return;

              const cellPos = recordPos + 1 + cellOffset;
              tr.setNodeMarkup(cellPos, undefined, {
                ...cellNode.attrs,
                value: result,
              });
              mutated = true;
            });
          }
        });

        return false;
      });
    }

    if (!mutated) return null;

    return tr.setMeta("addToHistory", false).setMeta("formulaSync", true);
  },
});
