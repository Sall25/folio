import { Button } from "@/components/tiptap-ui-primitive/button";
import { useMoveRowCol } from "./use-move-row-column";
import {
  MoveDownIcon,
  MoveLeftIcon,
  MoveRightIcon,
  MoveUpIcon,
} from "lucide-react";

type OrientationMap = { row: "up" | "down"; col: "left" | "right" };

export interface MoveRowColButtonProps<
  T extends keyof OrientationMap = keyof OrientationMap,
> {
  hideWhenUnavailable?: boolean;
  text?: string;
  target?: T;
  orientation?: OrientationMap[T];
  onAction?: () => void;
  className?: string;
}

export function TableMoveRowColButton({
  hideWhenUnavailable = false,
  target = "row",
  orientation = "up",
  text,
  onAction,
  className,
}: MoveRowColButtonProps) {
  const { isVisible, rowIndex, colIndex, editor } = useMoveRowCol({
    hideWhenUnavailable,
    orientation,
    target,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      className={className}
      onPointerDown={(e) => {
        e.preventDefault();
        console.log("tableMoveRowColButton");

        if (rowIndex === undefined || colIndex === undefined) return;

        if (target === "row") {
          if (orientation === "up") {
            console.log("moved up");
            editor?.commands.moveRowUp(rowIndex);
          } else if (orientation === "down") {
            console.log("moved down");
            editor?.commands.moveRowDown(rowIndex);
          }
        } else if (target === "col") {
          if (orientation === "left") {
            console.log("moved left");
            editor?.commands.moveColLeft(colIndex);
          } else if (orientation === "right") {
            console.log("moved right");
            editor?.commands.moveColRight(colIndex);
          }
        }

        onAction?.();
        editor?.commands.unlockTableHandle();
      }}
      // onClick={() => {
      //   console.log("tableMoveRowColButton");

      //   if (rowIndex === undefined || colIndex === undefined) return;

      //   if (target === "row") {
      //     if (orientation === "up") {
      //       console.log("moved up");
      //       editor?.commands.moveRowUp(rowIndex);
      //       // moveTableRow({ from: rowIndex, to: rowIndex - 1 });
      //     } else if (orientation === "down") {
      //       console.log("moved down");
      //       editor?.commands.moveRowDown(rowIndex);
      //       // moveTableRow({ from: rowIndex, to: rowIndex + 1 });
      //     }
      //   } else if (target === "col") {
      //     if (orientation === "left") {
      //       console.log("moved left");
      //       editor?.commands.moveColLeft(colIndex);
      //       // moveTableColumn({ from: colIndex, to: colIndex - 1 });
      //     } else if (orientation === "right") {
      //       console.log("moved right");
      //       editor?.commands.moveColRight(colIndex);
      //       // moveTableColumn({ from: colIndex, to: colIndex + 1 });
      //     }
      //   }
      // }}
    >
      {orientation === "up" && <MoveUpIcon className="tiptap-button-icon" />}
      {orientation === "down" && (
        <MoveDownIcon className="tiptap-button-icon" />
      )}
      {orientation === "left" && (
        <MoveLeftIcon className="tiptap-button-icon" />
      )}
      {orientation === "right" && (
        <MoveRightIcon className="tiptap-button-icon" />
      )}
      {text && <span>{text}</span>}
    </Button>
  );
}
