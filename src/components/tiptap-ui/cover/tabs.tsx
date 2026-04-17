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
          ? "2px solid var(--tt-brand-color-500)"
          : "2px solid transparent",
        borderRadius: 0,
      }}
      onClick={() => onActive(target)}
    >
      {label}
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
    <CardItemGroup style={{ width: "100%", margin: "10px 0px" }}>
      <ButtonGroup orientation="horizontal">
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
      </ButtonGroup>
    </CardItemGroup>
  );
}
