import type { Citation, CitationFormat } from "../types";

export const FORMAT_LABELS: Record<CitationFormat, string> = {
  apa: "APA",
  mla: "MLA",
  chicago: "Chicago",
};

function formatApa(c: Citation): string {
  const authors = c.authors.join(", ");
  const pages = c.pages ? `, ${c.pages}` : "";
  const volume = c.volume ? `, ${c.volume}` : "";
  const issue = c.issue ? `(${c.issue})` : "";
  return `${authors} (${c.year}). ${c.title}. ${c.source}${volume}${issue}${pages}.`;
}

function formatMla(c: Citation): string {
  const authors =
    c.authors.length > 1 ? `${c.authors[0]}, et al.` : c.authors[0];
  const pages = c.pages ? `, pp. ${c.pages}` : "";
  const volume = c.volume ? `, vol. ${c.volume}` : "";
  const issue = c.issue ? `, no. ${c.issue}` : "";
  return `${authors}. "${c.title}." ${c.source}${volume}${issue}${pages}, ${c.year}.`;
}

function formatChicago(c: Citation): string {
  const authors = c.authors.join(", ");
  const pages = c.pages ? `: ${c.pages}` : "";
  const volume = c.volume ? ` ${c.volume}` : "";
  const issue = c.issue ? `, no. ${c.issue}` : "";
  return `${authors}. "${c.title}." ${c.source}${volume}${issue} (${c.year})${pages}.`;
}

export function formatCitation(citation: Citation): string {
  switch (citation.format) {
    case "apa":
      return formatApa(citation);
    case "mla":
      return formatMla(citation);
    case "chicago":
      return formatChicago(citation);
  }
}
