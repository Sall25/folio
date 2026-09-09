import { RepositionButton } from "./reposition-button";
import { AspectButton } from "./aspect-button";
import { CardActionsMenu } from "./card-actions-menu";
import type { Page } from "src/types";
import "./board-card-controls.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { EditToggleButton } from "./edit-toggle-button";
import { useState } from "react";

export function BoardCardControls({
  record,
  onReposition,
  onAspect,
  lastEditedBy,
  lastEditedAt,
  repositioning,
  menuOpen,
  onMenuOpenChange,
  editing,
  onEnableEdit,
  onOpenRecord,
  // color,
}: {
  record: Page;
  onReposition?: () => void;
  onAspect?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  repositioning?: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (v: boolean) => void;
  editing: boolean;
  onEnableEdit: () => void;
  onOpenRecord: () => void;
  color?: string;
}) {
  const [preventClose, setPreventClose] = useState(false);
  return (
    <div
      className="db-card-controls"
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-open={menuOpen || (!menuOpen && preventClose) || undefined}
    >
      {onReposition && (
        <>
          <RepositionButton
            repositioning={repositioning}
            onReposition={onReposition}
          />
          <Separator orientation="vertical" />
        </>
      )}
      {onAspect && <AspectButton onAspect={onAspect} />}

      <EditToggleButton
        editing={editing}
        onEnableEdit={onEnableEdit}
        onOpen={onOpenRecord}
      />
      <Separator orientation="vertical" style={{ width: 0.5 }} />
      <CardActionsMenu
        record={record}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onPreventClose={setPreventClose}
        lastEditedBy={lastEditedBy}
        lastEditedAt={lastEditedAt}
      />
    </div>
  );
}
