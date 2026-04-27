import { useState } from "react";
import type { Editor } from "@tiptap/core";
import type { CSSProperties } from "react";
import { useTurnIntoPage } from "./use-turn-into-page";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { CheckIcon } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface TurnIntoPageButtonProps {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  onTurnedIntoPage?: () => void;
  className?: string;
  style?: Partial<CSSProperties>;
}

export function TurnIntoPageButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  onTurnedIntoPage,
  className = "",
  style = {},
}: TurnIntoPageButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible, canTurn, handleTurnIntoPage, label, Icon } =
    useTurnIntoPage({
      editor,
      hideWhenUnavailable,
      onTurnedIntoPage,
    });

  const [done, setDone] = useState(false);

  if (!isVisible) return null;

  const handleClick = () => {
    const success = handleTurnIntoPage();
    if (success) {
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    }
  };

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      aria-label={label}
      disabled={hideWhenUnavailable && !canTurn}
      onClick={handleClick}
      className={className}
      style={
        {
          fontFamily: "var(--font-ui)",
          justifyContent: "flex-start",
          ...style,
        } as CSSProperties
      }
    >
      {done ? (
        <CheckIcon className="tiptap-button-icon" />
      ) : (
        <Icon className="tiptap-button-icon" />
      )}
      {text && <span>{text}</span>}
    </Button>
  );
}
