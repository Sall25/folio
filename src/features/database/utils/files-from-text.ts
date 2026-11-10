import type { FileValue } from "src/types";

/** Addresses in text ("https://a.png, b.com/doc.pdf") as link files, for a
 *  Files & media cell: converting a text or URL property, or pasting. Words
 *  that aren't addresses are skipped. */
export function filesFromText(text: string): FileValue[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        /^https?:\/\/\S+$/i.test(s) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s),
    )
    .map((s) => {
      const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const name = decodeURIComponent(
        url.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? url,
      );
      return {
        id: crypto.randomUUID(),
        name: name.includes(".") ? name : url.replace(/^https?:\/\//, ""),
        url,
        kind: "link" as const,
      };
    });
}
