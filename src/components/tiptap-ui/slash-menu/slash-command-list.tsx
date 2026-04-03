// /* eslint-disable @typescript-eslint/no-explicit-any */
// import type { SuggestionProps } from "@tiptap/suggestion";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
// import { Separator } from "src/components/tiptap-ui-primitive/separator";
// import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";

// import "./slash-command-list.scss";
// import { useMenuNavigation } from "src/hooks/use-menu-navigation";
// import type { SlashCommand as SlashItem } from "./slash-commands";

// // Props received from ReactRenderer via Tiptap Suggestion
// type Props = SuggestionProps<SlashItem> & {
//   selectedIndex?: number;
//   onClickItem?: (item: SlashItem) => void;
// };

// export default function SlashList(props: Props) {
//   const { items = [], onClickItem } = props;

//   const isSelectable = (item: any) =>
//     item.mark?.type !== "title" && item.mark?.type !== "separator";

//   const selectableItems = useMemo(
//     () => items.filter((item) => isSelectable(item)),
//     [items],
//   );

//   const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
//   const containerRef = useRef<HTMLDivElement | null>(null);

//   const { selectedIndex } = useMenuNavigation({
//     editor: props.editor,
//     items: selectableItems,
//     containerRef,
//     orientation: "vertical",
//     autoSelectFirstItem: true,
//     onSelect: (item) => {
//       onClickItem?.(item);
//     },
//   });

//   const selectedItem = useMemo(
//     () => selectableItems[selectedIndex ?? 0],
//     [selectableItems, selectedIndex],
//   );

//   const selectedFullIndex = useMemo(
//     () => items.findIndex((item) => item.id === selectedItem?.id),
//     [items, selectedItem],
//   );

//   const [menuVisible, setMenuVisible] = useState(false);

//   // toggle it after mount (or after 150ms for demo)
//   useEffect(() => {
//     const raf = requestAnimationFrame(() => {
//       setMenuVisible(true);
//       // if (containerRef.current) {
//       //   containerRef.current.focus()
//       // }
//     });
//     return () => cancelAnimationFrame(raf);
//   }, []);

//   useEffect(() => {
//     const el = itemRefs.current[selectedFullIndex ?? 0];
//     if (!el) return;

//     el.scrollIntoView({
//       block: "nearest",
//       inline: "nearest",
//       behavior: "smooth",
//     });
//   }, [selectedFullIndex]);

//   useEffect(() => {
//     const el = itemRefs.current[selectedFullIndex];
//     const container = containerRef.current;

//     if (!el || !container) return;

//     const elTop = el.offsetTop;
//     const elBottom = elTop + el.offsetHeight;

//     const viewTop = container.scrollTop;
//     const viewBottom = viewTop + container.clientHeight;

//     if (elTop < viewTop) {
//       container.scrollTo({
//         top: elTop,
//         behavior: "smooth",
//       });
//     } else if (elBottom > viewBottom) {
//       container.scrollTo({
//         top: elBottom - container.clientHeight,
//         behavior: "smooth",
//       });
//     }
//   }, [selectedIndex, selectedFullIndex]);

//   return (
//     <Card
//       ref={containerRef}
//       tabIndex={0}
//       className="slash-menu"
//       role="listbox"
//       aria-label="Slash commands"
//       data-slash-menu-open={menuVisible}
//     >
//       {items.length === 0 ? (
//         <CardGroupLabel>No commands</CardGroupLabel>
//       ) : (
//         items.map((item, i) => {
//           const selectable = isSelectable(item);
//           const isActive = selectedFullIndex === i;
//           const Icon = item.icon;
//           const highlighted =
//             item.isActive?.(props.editor) || selectedFullIndex === i;

//           return (
//             <ButtonGroup
//               style={{
//                 minWidth: "200px",
//                 // pointerEvents: selectable ? 'auto' : 'none',
//               }}
//               orientation="vertical"
//               key={item.id}
//               ref={(node) => {
//                 if (selectable) itemRefs.current[i] = node;
//               }}
//               role={selectable ? "option" : undefined}
//               aria-selected={selectable ? isActive : undefined}
//               onMouseDown={(e) => {
//                 if (!selectable) return;
//                 e.preventDefault();
//                 onClickItem?.(item);
//               }}
//             >
//               {item.type === "title" && (
//                 <CardGroupLabel className="slash-title">
//                   {item.title}
//                 </CardGroupLabel>
//               )}

//               {item.type === "separator" && (
//                 <Separator orientation="horizontal" />
//               )}

//               {selectable && item.type === "command" && (
//                 <Button
//                   role="menuitem"
//                   variant="ghost"
//                   data-highlighted={highlighted}
//                   className="slash-item"
//                 >
//                   {Icon && <Icon className="tiptap-button-icon" />}
//                   <span>{item.title}</span>
//                 </Button>
//               )}
//             </ButtonGroup>
//           );
//         })
//       )}
//     </Card>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SuggestionProps } from "@tiptap/suggestion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";

import "./slash-command-list.scss";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import type { SlashCommand as SlashItem } from "./slash-commands";

type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number;
  onClickItem?: (item: SlashItem) => void;
};

export default function SlashList(props: Props) {
  const { items = [], onClickItem } = props;

  const isSelectable = (item: SlashItem) => item.type === "command";

  const selectableItems = useMemo(() => items.filter(isSelectable), [items]);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { selectedIndex } = useMenuNavigation({
    editor: props.editor,
    items: selectableItems,
    containerRef,
    orientation: "vertical",
    autoSelectFirstItem: true,
    onSelect: (item) => {
      onClickItem?.(item);
    },
  });

  const selectedItem = useMemo(
    () => selectableItems[selectedIndex ?? 0],
    [selectableItems, selectedIndex],
  );

  const selectedFullIndex = useMemo(
    () => items.findIndex((item) => item.id === selectedItem?.id),
    [items, selectedItem],
  );

  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMenuVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = itemRefs.current[selectedFullIndex ?? 0];
    if (!el) return;
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [selectedFullIndex]);

  useEffect(() => {
    const el = itemRefs.current[selectedFullIndex];
    const container = containerRef.current;
    if (!el || !container) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (elTop < viewTop) {
      container.scrollTo({ top: elTop, behavior: "smooth" });
    } else if (elBottom > viewBottom) {
      container.scrollTo({
        top: elBottom - container.clientHeight,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, selectedFullIndex]);

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      className="slash-menu"
      role="listbox"
      aria-label="Slash commands"
      data-slash-menu-open={menuVisible}
    >
      {items.length === 0 ? (
        <CardGroupLabel>No commands</CardGroupLabel>
      ) : (
        items.map((item, i) => {
          const selectable = isSelectable(item);
          const isActive = selectedFullIndex === i;
          const Icon = item.icon;
          const highlighted =
            item.isActive?.(props.editor) || selectedFullIndex === i;

          return (
            <ButtonGroup
              style={{ minWidth: "200px" }}
              orientation="vertical"
              key={item.id}
              ref={(node) => {
                if (selectable) itemRefs.current[i] = node;
              }}
              role={selectable ? "option" : undefined}
              aria-selected={selectable ? isActive : undefined}
              onMouseDown={(e) => {
                if (!selectable) return;
                e.preventDefault();
                onClickItem?.(item);
              }}
            >
              {item.type === "title" && (
                <CardGroupLabel className="slash-title">
                  {item.title}
                </CardGroupLabel>
              )}

              {item.type === "separator" && (
                <Separator orientation="horizontal" />
              )}

              {item.type === "command" && (
                <Button
                  role="menuitem"
                  variant="ghost"
                  // data-highlighted={highlighted}
                  data-active-state={highlighted ? "on" : "off"}
                  className="slash-item"
                >
                  {item.highlightColor ? (
                    <span
                      className="tiptap-button-icon slash-color-swatch"
                      style={{ backgroundColor: item.highlightColor }}
                    />
                  ) : item.textColor ? (
                    <span
                      style={{
                        color: item.textColor,
                      }}
                    >
                      A
                    </span>
                  ) : (
                    Icon && <Icon className="tiptap-button-icon" />
                  )}

                  {/* {Icon && <Icon className="tiptap-button-icon" />} */}
                  <span>{item.title}</span>
                </Button>
              )}
            </ButtonGroup>
          );
        })
      )}
    </Card>
  );
}
