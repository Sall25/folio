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
import "./url-cell-display.scss";

function toHref(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export interface UrlCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
}

export function UrlCellDisplay({
  value,
  onChange,
  readonly,
}: UrlCellDisplayProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const link = value ? (
    <a
      href={toHref(value)}
      className="db-cell-link db-cell-link--url"
      onClick={(e) => e.stopPropagation()}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink size={11} />
      {value}
    </a>
  ) : (
    <span className="db-cell-link__empty" />
  );

  if (readonly) return <div className="db-td--url">{link}</div>;

  function save() {
    const next = draft.trim();
    if (next !== value) onChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setDraft(value);
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
          {link}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px" }}>
          <CardItemGroup orientation="horizontal">
            <TextareaAutosize
              cols={40}
              maxRows={1}
              placeholder="https://example.com"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <Spacer />
            <Button
              variant="ghost"
              style={{
                background: "var(--tt-brand-color-400)",
                borderRadius: "var(--tt-radius-xl)",
              }}
              disabled={!draft.trim()}
              onClick={save}
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
  );
}
