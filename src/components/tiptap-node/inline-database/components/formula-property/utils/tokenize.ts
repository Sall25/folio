import { FUNCTION_NAMES } from "../config";

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function tokenize(code: string): string {
  // Escape HTML first
  let result = "";
  let i = 0;

  while (i < code.length) {
    // String literals
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      const str = code.slice(i, j + 1);
      result += `<span class="fp-tok-string">${escHtml(str)}</span>`;
      i = j + 1;
      continue;
    }

    // Numbers
    if (
      /\d/.test(code[i]) ||
      (code[i] === "-" && /\d/.test(code[i + 1] ?? ""))
    ) {
      let j = i + 1;
      while (j < code.length && /[\d.]/.test(code[j])) j++;
      result += `<span class="fp-tok-number">${escHtml(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Identifiers (functions or keywords)
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i + 1;
      while (j < code.length && /[\w]/.test(code[j])) j++;
      const word = code.slice(i, j);
      const isFunc = FUNCTION_NAMES.has(word);
      const isBool = word === "true" || word === "false";
      const cls = isFunc ? "fp-tok-fn" : isBool ? "fp-tok-bool" : "fp-tok-prop";
      result += `<span class="${cls}">${escHtml(word)}</span>`;
      i = j;
      continue;
    }

    // Operators
    if (/[+\-*/<>=!&|]/.test(code[i])) {
      let j = i + 1;
      while (j < code.length && /[+\-*/<>=!&|]/.test(code[j])) j++;
      result += `<span class="fp-tok-op">${escHtml(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    result += escHtml(code[i]);
    i++;
  }

  return result;
}
