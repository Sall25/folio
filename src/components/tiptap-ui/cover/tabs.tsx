import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import type { Target } from "./types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";

type TabProps = {
  active: boolean;
  onActive: (target: Target) => void;
  target: Target;
  label: string;
};

function Tab({ active, onActive, target, label }: TabProps) {
  return (
    <Button
      variant="ghost"
      style={{
        borderBottom: active
          ? "2px solid var(--tt-text-primary)"
          : "1px solid var(--tt-border-color)",
        borderRadius: 0,
      }}
      onClick={() => onActive(target)}
    >
      <span className="tiptap-button-text">{label}</span>
    </Button>
  );
}

export function Tabs({
  target,
  onActive,
}: {
  target: Target;
  onActive: (target: Target) => void;
}) {
  return (
    <CardItemGroup>
      <ButtonGroup orientation="horizontal" style={{ gap: 0 }}>
        <Tab
          active={target == "Emoji"}
          onActive={onActive}
          target="Emoji"
          label="Emoji"
        />
        <Tab
          active={target == "Icons"}
          onActive={onActive}
          target="Icons"
          label="Icons"
        />
        <Tab
          active={target === "Upload"}
          onActive={onActive}
          target="Upload"
          label="Upload"
        />
      </ButtonGroup>
    </CardItemGroup>
  );
}
