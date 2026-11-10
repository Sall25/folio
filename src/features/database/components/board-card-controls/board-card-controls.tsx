import { RepositionButton } from "./reposition-button";
import { AspectButton } from "./aspect-button";
import { CardActionsMenu } from "./card-actions-menu";
import type { Page } from "src/types";
import "./board-card-controls.scss";
import { EditToggleButton } from "./edit-toggle-button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";

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
  onAssignToMe,
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
  /** Adds you to the assignee property; absent when you're already on it. */
  onAssignToMe?: () => void;
  color?: string;
}) {
  const { t } = useTranslation();
  const [preventClose, setPreventClose] = useState(false);
  return (
    <div
      className="db-card-controls"
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-open={
        menuOpen || (!menuOpen && preventClose) || repositioning || undefined
      }
    >
      {onReposition && (
        <RepositionButton
          repositioning={repositioning}
          onReposition={onReposition}
        />
      )}
      {onAspect && <AspectButton onAspect={onAspect} />}

      {onAssignToMe && (
        <Button
          variant="ghost"
          className="db-card-controls__btn"
          size="small"
          tooltip={t("database.assign.assignToMe")}
          aria-label={t("database.assign.assignToMe")}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAssignToMe();
          }}
        >
          <UserPlus className="tiptap-button-icon" size={14} />
        </Button>
      )}

      <EditToggleButton
        editing={editing}
        onEnableEdit={onEnableEdit}
        onOpen={onOpenRecord}
      />

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
