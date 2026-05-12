// import type { Editor } from "@tiptap/core";
// import type { DatabaseProperty, ID, ConfigOf } from "../../types/types";
// import { evaluateFormula } from "./formula-evaluator";
// import { buildCellValueMap } from "./build-cell-values";

// /**
//  * Walks every databaseRecord inside the given database node,
//  * evaluates all formula properties, and writes the results back
//  * into each formulaCell's value attr via a single transaction.
//  *
//  * Should be called:
//  *  - After the expression changes (Done in FormulaEditor)
//  *  - After any cell value changes that could affect a formula
//  */
// // export function resolveFormulaValues(
// //   editor: Editor,
// //   nodeId: ID,
// //   properties: DatabaseProperty[],
// // ): void {
// //   const formulaProps = properties.filter((p) => p.config.type === "formula");
// //   if (!formulaProps.length) return;

// //   const { state } = editor;
// //   const { doc, tr } = state;

// //   let mutated = false;

// //   // Find the database node
// //   doc.descendants((dbNode, dbPos) => {
// //     if (dbNode.type.name !== "databaseTable") return;
// //     if (dbNode.attrs.id !== nodeId) return;

// //     // Walk each databaseRecord child
// //     dbNode.forEach((recordNode, recordOffset) => {
// //       if (recordNode.type.name !== "databaseRecord") return;

// //       const recordPos = dbPos + 1 + recordOffset;

// //       // Build a flat cellValues map for this record
// //       const cellValues = buildCellValueMap(recordNode, properties);

// //       // Evaluate each formula property
// //       for (const prop of formulaProps) {
// //         const config = prop.config as ConfigOf<"formula">;
// //         const result = evaluateFormula(config.expression, {
// //           properties,
// //           cellValues,
// //         });

// //         // Find the formulaCell node for this property inside this record
// //         recordNode.forEach((cellNode, cellOffset) => {
// //           if (cellNode.type.name !== "formulaCell") return;
// //           if (cellNode.attrs.propertyId !== prop.id) return;
// //           if (cellNode.attrs.value === result) return; // skip if unchanged

// //           const cellPos = recordPos + 1 + cellOffset;
// //           tr.setNodeMarkup(cellPos, undefined, {
// //             ...cellNode.attrs,
// //             value: result,
// //           });
// //           mutated = true;
// //         });
// //       }
// //     });

// //     return false; // stop descending after finding the database node
// //   });

// //   if (mutated) {
// //     // Mark as non-undoable — formula values are derived, not user edits
// //     editor.view.dispatch(tr.setMeta("addToHistory", false));
// //   }
// // }
// export function resolveFormulaValues(
//   editor: Editor,
//   nodeId: ID,
//   properties: DatabaseProperty[],
// ): void {
//   const formulaProps = properties.filter((p) => p.config.type === "formula");
//   console.log("formulaProps", formulaProps);
//   if (!formulaProps.length) return;

//   const { state } = editor;
//   const { doc, tr } = state;

//   let mutated = false;

//   doc.descendants((dbNode, dbPos) => {
//     console.log("node", dbNode.type.name, dbNode.attrs.id);
//     if (dbNode.type.name !== "databaseTable") return;
//     if (dbNode.attrs.id !== nodeId) return;

//     dbNode.forEach((recordNode, recordOffset) => {
//       console.log("recordNode", recordNode.type.name);
//       const recordPos = dbPos + 1 + recordOffset;
//       const cellValues = buildCellValueMap(recordNode, properties);
//       console.log("cellValues", cellValues);

//       for (const prop of formulaProps) {
//         const config = prop.config as ConfigOf<"formula">;
//         const result = evaluateFormula(config.expression, {
//           properties,
//           cellValues,
//         });
//         console.log("result", result);

//         recordNode.forEach((cellNode, cellOffset) => {
//           console.log("cellNode", cellNode.type.name, cellNode.attrs);
//           if (cellNode.type.name !== "formulaCell") return;
//           if (cellNode.attrs.propertyId !== prop.id) return;
//           console.log("found formulaCell, updating", result);
//           const cellPos = recordPos + 1 + cellOffset;
//           tr.setNodeMarkup(cellPos, undefined, {
//             ...cellNode.attrs,
//             value: result,
//           });
//           mutated = true;
//         });
//       }
//     });

//     return false;
//   });

//   console.log("mutated", mutated);
//   if (mutated) {
//     editor.view.dispatch(tr.setMeta("addToHistory", false));
//   }
// }

import type { Editor } from "@tiptap/core";
import type { DatabaseProperty, ID, ConfigOf } from "../../types/types.js";
import { buildCellValueMap } from "./build-cell-values.js";
import { evaluateFormula } from "./formula-evaluator";

/**
 * Walks every databaseRecord inside the given database node,
 * evaluates all formula properties, and writes the results back
 * into each formulaCell's value attr via a single transaction.
 *
 * Should be called:
 *  - After the expression changes (Done in FormulaEditor)
 *  - After any cell value changes that could affect a formula
 */
export function resolveFormulaValues(
  editor: Editor,
  nodeId: ID,
  properties: DatabaseProperty[],
): void {
  const formulaProps = properties.filter((p) => p.config.type === "formula");
  if (!formulaProps.length) return;

  const { state } = editor;
  const { doc, tr } = state;

  let mutated = false;

  // Find the database node
  doc.descendants((dbNode, dbPos) => {
    if (dbNode.type.name !== "database") return;
    if (dbNode.attrs.id !== nodeId) return;

    // Walk each databaseRecord child
    dbNode.forEach((recordNode, recordOffset) => {
      if (recordNode.type.name !== "databaseRecord") return;

      const recordPos = dbPos + 1 + recordOffset;

      // Build a flat cellValues map for this record
      const cellValues = buildCellValueMap(recordNode, properties);

      // Evaluate each formula property
      for (const prop of formulaProps) {
        const config = prop.config as ConfigOf<"formula">;
        const result = evaluateFormula(config.expression, {
          properties,
          cellValues,
        });

        // Find the formulaCell node for this property inside this record
        recordNode.forEach((cellNode, cellOffset) => {
          if (cellNode.type.name !== "formulaCell") return;
          if (cellNode.attrs.propertyId !== prop.id) return;
          if (cellNode.attrs.value === result) return; // skip if unchanged

          const cellPos = recordPos + 1 + cellOffset;
          tr.setNodeMarkup(cellPos, undefined, {
            ...cellNode.attrs,
            value: result,
          });
          mutated = true;
        });
      }
    });

    return false; // stop descending after finding the database node
  });

  if (mutated) {
    // Mark as non-undoable — formula values are derived, not user edits
    editor.view.dispatch(tr.setMeta("addToHistory", false));
  }
}
