import type { ResourceLink } from "../types";

export const MOCK_LINKS: ResourceLink[] = [
  {
    id: "1",
    title: "MIT OpenCourseWare — Introduction to Algorithms (6.006)",
    url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020",
    description:
      "Full lecture notes, problem sets, and exams from MIT's algorithms course.",
    category: "course",
    tags: ["Algorithms", "CS"],
    course: "CS101",
    savedAt: "2025-09-12T10:00:00Z",
  },
  {
    id: "2",
    title: "The Missing Semester of Your CS Education",
    url: "https://missing.csail.mit.edu",
    description:
      "Practical tools every CS student should know — shell, git, editors.",
    category: "course",
    tags: ["Tools", "CS"],
    savedAt: "2025-10-01T14:30:00Z",
  },
  {
    id: "3",
    title: "Paul Graham — Essays",
    url: "https://paulgraham.com/articles.html",
    category: "article",
    tags: ["Writing", "Startups"],
    savedAt: "2025-10-15T09:00:00Z",
  },
  {
    id: "4",
    title: "Stanford Encyclopedia of Philosophy",
    url: "https://plato.stanford.edu",
    description: "Peer-reviewed reference work on every topic in philosophy.",
    category: "docs",
    tags: ["Philosophy"],
    course: "Phil 101",
    savedAt: "2025-11-03T11:00:00Z",
  },
  {
    id: "5",
    title: "Excalidraw",
    url: "https://excalidraw.com",
    description:
      "Virtual whiteboard for sketching diagrams and system designs.",
    category: "tool",
    tags: ["Design", "Diagrams"],
    savedAt: "2025-11-20T16:00:00Z",
  },
  {
    id: "6",
    title: "3Blue1Brown — Essence of Linear Algebra",
    url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
    description: "Visual, intuitive series on linear algebra fundamentals.",
    category: "video",
    tags: ["Math", "Linear Algebra"],
    course: "Math 201",
    savedAt: "2025-12-01T08:00:00Z",
  },
];
