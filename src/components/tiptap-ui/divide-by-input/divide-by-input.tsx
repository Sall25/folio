import { useCallback, useRef } from "react";
import { Divide } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import "./divide-by-input.scss";

interface DivideByInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function DivideByInput({ value, onChange }: DivideByInputProps) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setDraft(String(value));
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
    },
    [value],
  );

  const commit = useCallback(() => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  }, [draft, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    },
    [commit],
  );

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" style={{ minWidth: 210 }}>
          <Divide className="tiptap-button-icon" data-size="large" />
          <span className="tiptap-button-text">Divide by</span>
          <Spacer orientation="horizontal" />
          <span className="tiptap-button-text" style={{ opacity: 0.8 }}>
            {value}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent side="right" align="start">
        <Card style={{ minWidth: 200, padding: "6px 8px" }}>
          <CardItemGroup orientation="horizontal" style={{ gap: 6 }}>
            <input
              ref={inputRef}
              className="divide-by__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              type="number"
              min="1"
              placeholder="100"
            />
            <Button
              style={{
                background: "var(--tt-brand-color-400)",
                color: "white",
                borderRadius: "var(--tt-radius-xl)",
              }}
              onClick={commit}
            >
              <ArrowUp className="tiptap-button-icon" />
            </Button>
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
