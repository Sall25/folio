import { Editor } from "@tiptap/react";
import { type RecentType, type ColorMenuItem, type ColorType } from "./types";
import { type SetStateAction } from "react";
import { Circle, Type } from "lucide-react";

interface IColorMenuProps {
  editor: Editor;
  recent: RecentType;
  setRecent: React.Dispatch<SetStateAction<RecentType>>
}

export function ColorMenu({ editor, recent, setRecent }: IColorMenuProps) {

  function addRecentColor(color: ColorType) {
    setRecent(prev => {
      const list = prev[color.type].filter(c => c.color !== color.color)

      return {
        ...prev,
        [color.type]: [color, ...list].slice(0, 3)
      }
    })
  }


  const items: ColorMenuItem[] = [
    {
      label: 'Text color',
      type: 'Title'
    },
    /* Colors */
    {
      label: 'Defaut text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#808080', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#808080' }).run(),
    },
    {
      label: 'Gray Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#808080', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#808080' }).run(),
    },
    {
      label: 'Red Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#EF4444', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#EF4444' }).run(),
    },
    {
      label: 'Orange Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#F97316', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#F97316' }).run(),
    },
    {
      label: 'Yellow Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#EAB308', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#EAB308' }).run(),
    },
    {
      label: 'Green Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#22C55E', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#22C55E' }).run(),
    },
    {
      label: 'Blue Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#3B82F6', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#3B82F6' }).run(),
    },
    {
      label: 'Purple Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#A855F7', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#A855F7' }).run(),
    },
    {
      label: 'Pink Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#EC4899', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#EC4899' }).run(),
    },
    {
      label: 'Brown Text',
      type: 'ColorItem',
      icon: Type,
      color: { color: '#92400E', type: 'text' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ color: '#92400E' }).run(),
    },

    /* Separator */
    {
      label: 'Separator',
      type: 'Separator'
    },

    /* Background Colors */
    {
      label: 'Background color',
      type: 'Title'
    },

    {
      label: 'Default Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#050505', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#050505' }).run(),
    },
    {
      label: 'Gray Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#1F1F1F', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#1F1F1F' }).run(),
    },
    {
      label: 'Red Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#3A0D0D', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#3A0D0D' }).run(),
    },
    {
      label: 'Orange Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#40210A', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#40210A' }).run(),
    },
    {
      label: 'Yellow Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#3A2F0A', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#3A2F0A' }).run(),
    },
    {
      label: 'Green Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#0F2E1D', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#0F2E1D' }).run(),
    },
    {
      label: 'Blue Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#0E1F3A', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#0E1F3A' }).run(),
    },
    {
      label: 'Purple Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#25143A', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#25143A' }).run(),
    },
    {
      label: 'Pink Background',
      type: 'ColorItem',
      icon: Circle,
      color: { color: '#3A1224', type: 'highlight' },
      onSelect: () =>
        editor.chain().focus().toggleTextStyle({ backgroundColor: '#3A1224' }).run(),
    }
  ]

  return (
    <>
      {
        recent.text.length > 0 && (
          <>
            <span className="dropdown-title">Recent colors</span>
            {
              recent.text.map((color, index) => (
                <span key={index} className="dropdown-item">
                  <span style={{ color: color.color }}>A</span>
                  <span>{color.name ?? ''}</span>
                </span>
              ))
            }
            {
              recent.highlight.map((color, index) => (
                <span key={index} className="dropdown-item">
                  <Circle size={18} stroke={color.color} fill={color.color} />
                  <span>{color.name ?? ''}</span>
                </span>
              ))
            }
          </>
        )
      }
      {
        items.map((item, index) => {
          if (item.type === 'Title') {
            return (
              <span
                key={index}
                className="dropdown-title"
              >
                {item.label}
              </span>
            )
          }
          else if (item.type === 'Separator') {
            return (
              <span
                key={index}
                className="dropdown-divider"
              >
              </span>
            )
          }
          const Icon = item.icon
          const target = item.color?.type
          return (
            <span
              key={index}
              className="dropdown-item"
              onMouseDown={(e) => {
                e.preventDefault()
                item.onSelect?.()
                addRecentColor({ color: item.color?.color ?? 'black', name: item.label, type: item.color?.type ?? 'text' })
              }}
            >
              {target && target === 'text' && <span style={{ color: item.color?.color }}>A</span>}
              {Icon && target && target === 'highlight' &&
                <Icon
                  size={18}
                  stroke={item.color?.color}
                  fill={item.color?.color}
                />}
              <span>
                {item.label}
              </span>
            </span>
          )
        })
      }
    </>
  )
}