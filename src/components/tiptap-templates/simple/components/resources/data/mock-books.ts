import { COVER_COLORS } from "./cover-colors";
import type { Book } from "../types";

export const MOCK_BOOKS: Book[] = [
  {
    id: "1",
    title: "Deep Work",
    author: "Cal Newport",
    status: "reading",
    coverColor: COVER_COLORS.blue,
    course: "Productivity",
  },
  {
    id: "2",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    status: "reading",
    coverColor: COVER_COLORS.purple,
    course: "Psychology 101",
  },
  {
    id: "3",
    title: "The Craft of Research",
    author: "Booth, Colomb & Williams",
    status: "done",
    coverColor: COVER_COLORS.green,
    course: "Research Methods",
  },
  {
    id: "4",
    title: "Structure & Interpretation of Computer Programs",
    author: "Abelson & Sussman",
    status: "queue",
    coverColor: COVER_COLORS.gray,
    course: "CS101",
  },
  {
    id: "5",
    title: "The Design of Everyday Things",
    author: "Don Norman",
    status: "queue",
    coverColor: COVER_COLORS.yellow,
  },
  {
    id: "6",
    title: "How to Take Smart Notes",
    author: "Sönke Ahrens",
    status: "done",
    coverColor: COVER_COLORS.pink,
    course: "Study Skills",
  },
];
