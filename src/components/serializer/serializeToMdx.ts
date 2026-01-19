import { escapeAttr } from "./utils";

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: TiptapNode[];
};

export function serializeToMdx(doc: TiptapNode): string {
  return serializeNode(doc);
}

function serializeNode(node: TiptapNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content || []).map(serializeNode).join('\n\n');

    case 'sidebarBlock':
      return serializeSidebarBlock(node);

    case 'sidebarItem':
      return serializeSidebarItem(node);

    case 'paragraph':
      return serializeInline(node.content || []);

    case 'text':
      return node.text || '';

    default:
      return (node.content || []).map(serializeNode).join('');
  }
}

function serializeSidebarBlock(node: TiptapNode): string {
  const title = (node.attrs?.title || 'Sidebar') as string;

  const items = (node.content || []).map(serializeNode).join('\n');

  return `<Sidebar title="${escapeAttr(title)}">
  ${items}
  </Sidebar>
  `;
}

function serializeSidebarItem(node: TiptapNode): string {
  const text = serializeInline(node.content || []);
  return `  <SidebarItem>${text}</SidebarItem>`;
}

function serializeInline(nodes: TiptapNode[]): string {
  return nodes.map(n => {
    if (n.type === 'text') return n.text || '';
    return serializeNode(n);
  }).join('');
}
