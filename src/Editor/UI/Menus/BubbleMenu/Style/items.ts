
import { Code2, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Text } from "lucide-react";
import type { Editor } from "@tiptap/core";

type StyleItem = {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>
  action: (editor: Editor) => boolean
  isActive?: (editor: Editor) => boolean;
}

export const items: StyleItem[] = [{
  label: 'Text',
  icon: Text,
  action: (editor) => editor.chain().focus().setParagraph().run(),
  isActive: (editor) => editor.isActive('paragraph') ?? false
},
{
  label: 'Blockquote',
  icon: Quote,
  action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  isActive: (editor) => editor.isActive('blockquote') ?? false
}, {
  label: 'Code block',
  icon: Code2,
  action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  isActive: (editor) => editor.isActive('codeBlock') ?? false
}, {
  label: 'Heading 1',
  icon: Heading1,
  action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  isActive: (editor) => editor.isActive('heading', { level: 1 }) ?? false
}, {
  label: 'Heading 2',
  icon: Heading2,
  action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  isActive: (editor) => editor.isActive('heading', { level: 2 }) ?? false
}, {
  label: 'Heading 3',
  icon: Heading3,
  action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  isActive: (editor) => editor.isActive('heading', { level: 3 }) ?? false
}, {
  label: 'Bullet list',
  icon: List,
  action: (editor) => editor.chain().focus().toggleBulletList().run(),
  isActive: (editor) => editor.isActive('bulletList') ?? false
}, {
  label: 'Ordered list',
  icon: ListOrdered,
  action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  isActive: (editor) => editor.isActive('orderedList') ?? false
},]