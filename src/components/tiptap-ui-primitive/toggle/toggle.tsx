import { useState } from "react";
import "./toggle.scss";

type Props = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ checked = false, onChange, disabled = false }: Props) {
  const [internal, setInternal] = useState(checked);
  const isOn = onChange ? checked : internal;

  const handleClick = () => {
    if (disabled) return;
    if (onChange) {
      onChange(!isOn);
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
