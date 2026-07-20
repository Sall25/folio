import { useState } from "react";
import type { StatusGroup, StatusItem, StatusPropertyProps } from "src/types";
import { colorForGroup, DEFAULT_GROUPS } from "./config";
import { StatusPill } from "./status-pill";
import { StatusEditModal } from "./status-edit-modal";

import "./status-property.scss";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "src/components/tiptap-ui-primitive/input";

interface ModalState {
  item: StatusItem | null;
  groupId: string;
}

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableStatusRowProps {
  item: StatusItem;
  groupId: string;
  onEdit: (groupId: string, item: StatusItem) => void;
}

function SortableStatusRow({ item, groupId, onEdit }: SortableStatusRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      style={{
        minHeight: 28,
        height: 28,
        width: "100%",
        borderRadius: "var(--tt-radius-sm)",
        gap: 6,
        ...style,
      }}
      onClick={() => onEdit(groupId, item)}
      {...attributes}
    >
      {/* Drag handle — only this element triggers drag */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <GripVertical className="tiptap-button-icon" style={{ width: 11 }} />
      </span>

      <StatusPill name={item.name} color={item.color} />

      <Spacer orientation="horizontal" />

      {item.isDefault && <span className="sp-default-badge">DEFAULT</span>}
      <ChevronRight className="tiptap-button-icon-sub" />
    </Button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function StatusEditDisplay({
  groups: initialGroups,
  onChange,
}: StatusPropertyProps) {
  const [groups, setGroups] = useState<StatusGroup[]>(
    initialGroups ?? DEFAULT_GROUPS,
  );

  // Adopt external changes — the component is remounted per property, but the
  // config can also change under it (type change, another editor).
  const [prevInitial, setPrevInitial] = useState(initialGroups);
  if (initialGroups !== prevInitial) {
    setPrevInitial(initialGroups);
    setGroups(initialGroups ?? DEFAULT_GROUPS);
  }

  const [modal, setModal] = useState<ModalState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // avoids firing on click
    }),
  );

  const openEdit = (groupId: string, item: StatusItem) =>
    setModal({ item, groupId });

  const [addingGroupId, setAddingGroupId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const commitNew = (group: StatusGroup) => {
    const trimmed = newName.trim();
    if (trimmed) {
      setGroups((prev) => {
        const next = prev.map((g) =>
          g.id === group.id
            ? {
                ...g,
                items: [
                  ...g.items,
                  {
                    id: crypto.randomUUID(),
                    name: trimmed,
                    // Inherit the group's color so the pill reads as belonging
                    // to its section, as Notion does.
                    color: colorForGroup(g),
                  },
                ],
              }
            : g,
        );
        onChange?.(next);
        return next;
      });
    }
    setNewName("");
    setAddingGroupId(null);
  };

  const handleDragEnd = (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setGroups((prev) => {
      const next = prev.map((g) => {
        if (g.id !== groupId) return g;
        const oldIndex = g.items.findIndex((it) => it.id === active.id);
        const newIndex = g.items.findIndex((it) => it.id === over.id);
        return { ...g, items: arrayMove(g.items, oldIndex, newIndex) };
      });
      onChange?.(next);
      return next;
    });
  };

  const handleSave = (groupId: string, saved: StatusItem) => {
    setGroups((prev) => {
      const next = prev.map((g) => {
        if (g.id !== groupId) return g;
        const exists = g.items.find((it) => it.id === saved.id);
        return {
          ...g,
          items: exists
            ? g.items.map((it) => (it.id === saved.id ? saved : it))
            : [...g.items, saved],
        };
      });
      onChange?.(next);
      return next;
    });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    setGroups((prev) => {
      const next = prev.map((g) => ({
        ...g,
        items: g.items.filter((it) => it.id !== id),
      }));
      onChange?.(next);
      return next;
    });
    setModal(null);
  };

  return (
    <Card className="sp-card">
      <CardBody className="sp-groups" style={{ width: "100%", minWidth: 260 }}>
        {groups.map((group, gi) => (
          <CardItemGroup key={group.id} style={{ width: "100%", gap: 8 }}>
            <CardItemGroup orientation="horizontal">
              <CardGroupLabel>{group.label}</CardGroupLabel>
              <Spacer orientation="horizontal" />
              <Button
                variant="ghost"
                onClick={() => {
                  setNewName("");
                  setAddingGroupId(group.id);
                }}
                aria-label={`Add status to ${group.label}`}
              >
                <Plus className="tiptap-button-icon" />
              </Button>
            </CardItemGroup>
            {addingGroupId === group.id && (
              <Input
                autoFocus
                className="sp-new-input"
                value={newName}
                placeholder="Type a new option..."
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => commitNew(group)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitNew(group);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setNewName("");
                    setAddingGroupId(null);
                  }
                }}
              />
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(group.id, e)}
            >
              <SortableContext
                items={group.items.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                {group.items.map((item) => (
                  <SortableStatusRow
                    key={item.id}
                    item={item}
                    groupId={group.id}
                    onEdit={openEdit}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {group.items.length === 0 && (
              <p className="sp-empty">No statuses</p>
            )}

            {gi < groups.length - 1 && <div className="sp-divider" />}
          </CardItemGroup>
        ))}
      </CardBody>

      {modal && (
        <StatusEditModal
          item={modal.item}
          groupId={modal.groupId}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </Card>
  );
}
