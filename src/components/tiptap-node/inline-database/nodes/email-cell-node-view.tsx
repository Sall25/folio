import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { ArrowUp } from "lucide-react";
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
import "./email-cell-node-view.scss";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function EmailCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const [textContent, setTextContent] = useState(node.textContent);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      data-type="email-cell"
      className="db-td db-td--email"
    >
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) setTextContent(node.textContent); // sync on open
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" style={{ background: "transparent" }}>
            {node.textContent ? (
              <a
                href={`mailto:${node.textContent}`}
                className="db-cell-email__link"
                onClick={(e) => e.stopPropagation()}
                contentEditable={false}
              >
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
                placeholder="example@email.com"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
              <Spacer />
              <Button
                variant="ghost"
                style={{
                  background: "var(--tt-brand-color-400)",
                  borderRadius: "var(--tt-radius-xl)",
                }}
                disabled={!textContent.trim()}
                onClick={() =>
                  syncPage(() => {
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
                  }, node)
                }
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
