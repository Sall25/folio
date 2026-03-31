import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  Quote,
  Type,
} from "lucide-react";
import type { BlockTypeOption } from "./types";
import { TodoListIcon } from "src/components/tiptap-icons";

export const DEFAULT_BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    type: "paragraph",
    label: "Paragraph",
    isActive: (editor) => editor.isActive("paragraph"),
    icon: Type,
  },
  {
    type: "heading",
    label: "Heading 1",
    level: 1,
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    icon: Heading1,
  },
  {
    type: "heading",
    label: "Heading 2",
    level: 2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    icon: Heading2,
  },
  {
    type: "heading",
    label: "Heading 3",
    level: 3,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    icon: Heading3,
  },
  {
    type: "bulletList",
    label: "Bullet List",
    isActive: (editor) => editor.isActive("bulletList"),
    icon: List,
  },
  {
    type: "orderedList",
    label: "Ordered List",
    isActive: (editor) => editor.isActive("orderedList"),
    icon: ListOrdered,
  },
  {
    type: "taskList",
    label: "Task List",
    isActive: (editor) => editor.isActive("taskList"),
    icon: TodoListIcon,
  },
  {
    type: "blockquote",
    label: "Blockquote",
    isActive: (editor) => editor.isActive("blockquote"),
    icon: Quote,
  },
  {
    type: "codeBlock",
    label: "Code Block",
    isActive: (editor) => editor.isActive("codeBlock"),
    icon: Code2,
  },
  {
    type: "image",
    label: "Image",
    isActive: (editor) => editor.isActive("image"),
    icon: Image,
  },
  {
    type: "figure",
    label: "Figure",
    isActive: (editor) => editor.isActive("figure"),
  },
  {
    type: "table",
    label: "Figure",
    isActive: (editor) => editor.isActive("table"),
  },
];
