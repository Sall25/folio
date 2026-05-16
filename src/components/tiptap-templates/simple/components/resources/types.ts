// ─── Books ────────────────────────────────────────────────────────────────────

export type ReadingStatus = "reading" | "done" | "queue";

export interface Book {
  id: string;
  title: string;
  author: string;
  status: ReadingStatus;
  coverColor?: string;
  coverImage?: string;
  course?: string;
}

// ─── Papers ───────────────────────────────────────────────────────────────────

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  source: string; // journal, conference, arXiv, etc.
  doi?: string;
  url?: string;
  tags: string[];
  course?: string;
}

// ─── Links ────────────────────────────────────────────────────────────────────

export type LinkCategory =
  | "article"
  | "video"
  | "tool"
  | "course"
  | "docs"
  | "other";

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: LinkCategory;
  tags: string[];
  course?: string;
  savedAt: string; // ISO date string
}

// ─── Citations ────────────────────────────────────────────────────────────────

export type CitationFormat = "apa" | "mla" | "chicago";

export interface Citation {
  id: string;
  authors: string[];
  title: string;
  year: number;
  source: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  format: CitationFormat;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export type ResourceType = "books" | "papers" | "links" | "citations";

export interface ResourceStats {
  books: number;
  papers: number;
  links: number;
  citations: number;
}
