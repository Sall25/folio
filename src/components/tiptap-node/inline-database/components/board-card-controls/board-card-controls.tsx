import { RepositionButton } from "./reposition-button";
import { AspectButton } from "./aspect-button";
import { CardActionsMenu } from "./card-actions-menu";
import type { Page, DatabaseProperty } from "src/types";
import "./board-card-controls.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { EditToggleButton } from "./edit-toggle-button";

export function BoardCardControls({
  record,
  properties,
  onReposition,
  onAspect,
  onSetValue,
  onDelete,
  onDuplicate,
  onLayout,
  onPropertyVisibility,
  onOpenIn,
  lastEditedBy,
  lastEditedAt,
  repositioning,
  menuOpen,
  onMenuOpenChange,
  editing,
  onEnableEdit,
  onOpenRecord,
}: {
  record: Page;
  properties: DatabaseProperty[];
  onReposition?: () => void;
  onAspect?: () => void;
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onLayout?: () => void;
  onPropertyVisibility?: () => void;
  onOpenIn?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  repositioning?: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (v: boolean) => void;
  editing: boolean;
  onEnableEdit: () => void;
  onOpenRecord: () => void;
}) {
  return (
    <div
      className="db-card-controls"
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-open={menuOpen || undefined}
    >
      {onReposition && (
        <RepositionButton
          repositioning={repositioning}
          onReposition={onReposition}
        />
      )}
      {onAspect && <AspectButton onAspect={onAspect} />}
      <Separator orientation="vertical" />
      <EditToggleButton
        editing={editing}
        onEnableEdit={onEnableEdit}
        onOpen={onOpenRecord}
      />
      <Separator orientation="vertical" />
      <CardActionsMenu
        record={record}
        properties={properties}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onSetValue={onSetValue}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onLayout={onLayout}
        onPropertyVisibility={onPropertyVisibility}
        onOpenIn={onOpenIn}
        lastEditedBy={lastEditedBy}
        lastEditedAt={lastEditedAt}
      />
    </div>
  );
}
