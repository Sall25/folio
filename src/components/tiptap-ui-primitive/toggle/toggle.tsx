import { useState } from "react";
import "./toggle.scss";

type Props = {
  checked?: boolean;
  onChangeAsync?: (checked: boolean) => Promise<void>;
  disabled?: boolean;
};

export function Toggle({
  checked = false,
  onChangeAsync,
  disabled = false,
}: Props) {
  const [internal, setInternal] = useState(checked);
  const isOn = onChangeAsync ? checked : internal;

  const handleClick = async () => {
    if (disabled) return;
    if (onChangeAsync) {
      await onChangeAsync(!isOn);
    } else {
      setInternal(!internal);
    }
  };

  return (
    <button
      role="switch"
      aria-checked={isOn}
      onClick={handleClick}
      disabled={disabled}
      className="toggle"
      data-state={isOn ? "on" : "off"}
    >
      <span className="toggle__thumb" />
    </button>
  );
}
