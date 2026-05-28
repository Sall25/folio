// url-cell-node-view.tsx
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { ArrowUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function UrlCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const [textContent, setTextContent] = useState(node.textContent);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  // Ensure url has a protocol for the href
  function toHref(url: string): string {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      data-type="url-cell"
      className="db-td db-td--url"
      style={{ margin: 0 }}
    >
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) setTextContent(node.textContent);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            style={{
              background: "transparent",
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            {node.textContent ? (
              <a
                href={toHref(node.textContent)}
                className="db-cell-link db-cell-link--url"
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noopener noreferrer"
                contentEditable={false}
              >
                <ExternalLink size={11} />
                {node.textContent}
              </a>
            ) : (
              <span>{""}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card style={{ padding: "5px 10px" }}>
            <CardItemGroup orientation="horizontal">
              <TextareaAutosize
                cols={40}
                maxRows={1}
                placeholder="https://example.com"
                value={textContent}
                onChange={(e) =>
                  syncPage(() => {
                    setTextContent(e.target.value);
                  }, node)
                }
              />
              <Spacer />
              <Button
                variant="ghost"
                style={{
                  background: "var(--tt-brand-color-400)",
                  borderRadius: "var(--tt-radius-xl)",
                }}
                disabled={!textContent.trim()}
                onClick={() => {
                  if (!textContent.trim()) return;
                  const pos = getPos?.();
                  if (pos == null) return;
                  const { tr } = editor.state;
                  tr.insertText(
                    textContent,
                    pos + 1,
                    pos + 1 + node.content.size,
                  );
                  editor.view.dispatch(tr);
                  setOpen(false);
                }}
              >
                <ArrowUp
                  className="tiptap-button-icon"
                  style={{ color: "white" }}
                />
              </Button>
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
