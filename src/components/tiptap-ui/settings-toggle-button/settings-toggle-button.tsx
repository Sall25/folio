import { ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Toggle } from "src/components/tiptap-ui-primitive/toggle";

import "./settings-toggle-button.scss";
import { AArrowDown, LockKeyhole } from "lucide-react";
import { FitToWidthIcon } from "src/components/tiptap-icons";

export interface SettingsToggleProps {
  text?: string;
  checked?: boolean;
  disabled?: boolean;
  target: "text" | "width" | "lock";
  onChanged?: (checked: boolean) => void;
}

export function SettingsToggleButton({
  text,
  target,
  onChanged,
  checked,
  disabled,
}: SettingsToggleProps) {
  return (
    <ButtonGroup className="toggle-button-group" orientation="horizontal">
      {target === "text" ? (
        <AArrowDown />
      ) : target === "width" ? (
        <FitToWidthIcon />
      ) : (
        <LockKeyhole />
      )}
      {text && <span>{text}</span>}
      <Spacer orientation="horizontal" />
      <Toggle onChange={onChanged} checked={checked} disabled={disabled} />
    </ButtonGroup>
  );
}
