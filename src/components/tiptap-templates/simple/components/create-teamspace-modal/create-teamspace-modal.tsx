import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, UsersRound } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { ID, TeamspaceAccess } from "src/types";
import {
  useCreateTeamspaceWithPage,
  buildTeamspacePair,
} from "src/hooks/use-create-teamspace-with-page";
import { IconPicker } from "src/components/tiptap-ui/cover/icon-picker";
import { getIconList } from "src/components/tiptap-ui/cover/data/icon-list";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";

import "./create-teamspace-modal.scss";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

interface CreateTeamspaceModalProps {
  onClose: () => void;
  /** Called with the new teamspace-page id after a successful create. */
  onCreated?: (pageId: ID) => void;
}

const ACCESS_OPTIONS: {
  value: TeamspaceAccess;
  label: string;
  desc: string;
}[] = [
  {
    value: "open",
    label: "Open",
    desc: "Anyone can see and join this teamspace",
  },
  {
    value: "closed",
    label: "Closed",
    desc: "Anyone can see it, but joining needs an invite",
  },
  {
    value: "private",
    label: "Private",
    desc: "Only members can see this teamspace",
  },
];

// Popovers inside this modal must sit above it. The modal itself is at
// 10000 (see .cts-backdrop) so it clears the workspace settings modal (701)
// and the mobile sidebar drawer (950).
const POPOVER_Z = 10001;

// Mounted only while open (parent gates with &&), so state starts fresh each
// time — no reset effect, no setState-in-effect.
export function CreateTeamspaceModal({
  onClose,
  onCreated,
}: CreateTeamspaceModalProps) {
  const create = useCreateTeamspaceWithPage();
  const { person } = useCurrentPerson();
  const { workspace } = useCurrentWorkspace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | undefined>(undefined);
  const [access, setAccess] = useState<TeamspaceAccess>("open");
  const [iconOpen, setIconOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // This listener is on document; the settings modal's Escape listener
        // is on window. Stopping propagation here means Esc closes only this
        // modal, not the settings modal underneath it too.
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Resolve the chosen icon's component for the trigger preview. Only runs once
  // an icon is picked (after the picker has loaded the list).
  const selectedIcon = useMemo(() => {
    if (!iconName) return null;
    return getIconList().find((e) => e.name === iconName)?.icon ?? null;
  }, [iconName]);

  const selectedAccess =
    ACCESS_OPTIONS.find((a) => a.value === access) ?? ACCESS_OPTIONS[0];

  const canSubmit =
    !!name.trim() && !!person && !!workspace && !create.isPending;

  const submit = async () => {
    if (!canSubmit || !person || !workspace) return;
    const built = buildTeamspacePair({
      name,
      iconName,
      iconColor: iconColor ?? null,
      description,
      access,
      ownerId: person.id,
      workspaceId: workspace.id,
    });
    try {
      const { page } = await create.mutateAsync(built);
      onCreated?.(page.id);
      onClose();
    } catch {
      // keep the modal open on failure so the user can retry
    }
  };

  return createPortal(
    <div className="cts-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cts-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create a new teamspace"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cts-close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="cts-head">
          <h2 className="cts-title">Create a new teamspace</h2>
          <p className="cts-subtitle">
            Teamspaces are where your team organizes pages, permissions, and
            members
          </p>
        </div>

        {/* Icon */}
        <div className="cts-icon-block">
          <Popover open={iconOpen} onOpenChange={setIconOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="cts-icon-button">
                {selectedIcon ? (
                  <DynamicIcon
                    name={selectedIcon}
                    size={20}
                    style={{ color: iconColor }}
                  />
                ) : (
                  <UsersRound
                    size={26}
                    strokeWidth={2}
                    className="cts-icon-placeholder"
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              style={{ zIndex: POPOVER_Z }}
            >
              <Card style={{ padding: "8px 10px" }}>
                <IconPicker
                  onSelect={(picked, color) => {
                    setIconName(picked);
                    setIconColor(color);
                    setIconOpen(false);
                  }}
                />
              </Card>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="cts-icon-label"
            onClick={() => setIconOpen(true)}
          >
            Choose icon
          </button>
        </div>

        {/* Name */}
        <label className="cts-field">
          <span className="cts-field__label">Teamspace name</span>
          <input
            autoFocus
            className="cts-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="e.g. Finance"
          />
        </label>

        {/* Description */}
        <label className="cts-field">
          <span className="cts-field__label">Description</span>
          <textarea
            className="cts-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details about your teamspace"
            rows={3}
          />
        </label>

        {/* Permissions */}
        <div className="cts-field">
          <span className="cts-field__label">Permissions</span>
          <Popover open={accessOpen} onOpenChange={setAccessOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="cts-access">
                <span className="cts-access__text">
                  <span className="cts-access__label">
                    {selectedAccess.label}
                  </span>
                  <span className="cts-access__desc">
                    {selectedAccess.desc}
                  </span>
                </span>
                <ChevronDown size={16} className="cts-access__chevron" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              style={{ zIndex: POPOVER_Z }}
            >
              <Card style={{ padding: 4, minWidth: 320 }}>
                {ACCESS_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    className={`cts-access-option${a.value === access ? " is-active" : ""}`}
                    onClick={() => {
                      setAccess(a.value);
                      setAccessOpen(false);
                    }}
                  >
                    <span className="cts-access__label">{a.label}</span>
                    <span className="cts-access__desc">{a.desc}</span>
                  </button>
                ))}
              </Card>
            </PopoverContent>
          </Popover>
        </div>

        <div className="cts-footer">
          <span className="cts-learn">Learn about teamspaces</span>
          <Button className="cts-create" disabled={!canSubmit} onClick={submit}>
            <span className="tiptap-button-text">
              {create.isPending ? "Creating…" : "Create teamspace"}
            </span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
