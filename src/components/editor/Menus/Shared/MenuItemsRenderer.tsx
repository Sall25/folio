import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { type MenuItem } from "../FloatingMenu/components/GutterFloatingMenu/types";
import { ChevronRight } from 'lucide-react';

interface IMenuItemsRenderer {
  items: MenuItem[];
}

export function MenuItemsRenderer({ items }: IMenuItemsRenderer) {
  return (
    <>
      {
        items.map((item, index) => {
          const Icon = item.icon;

          if (item.type === "Sub" && item.content) {
            return (
              <DropdownMenu.Sub key={index}>
                <DropdownMenu.SubTrigger className="dropdown-item-select">
                  <span className="dropdown-item">
                    {Icon && <Icon size={16} />}
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight size={16} />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal >
                  <DropdownMenu.SubContent className='dropdown-menu active dropdown-scroll'>
                    {/* 🔥 RECURSION HAPPENS HERE */}
                    <MenuItemsRenderer items={item.content} />
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            );
          }

          if (item.type === "Separator") {
            return <DropdownMenu.Separator className='dropdown-divider' key={index} />;
          }

          if (item.type === "Title") {
            return (
              <DropdownMenu.Label key={index} className="dropdown-title">
                {item.label}
              </DropdownMenu.Label>
            );
          }


          return (
            <DropdownMenu.Item
              key={index}
              className="dropdown-item"
              onSelect={() => {
                item.action?.();
              }}
            >
              {item.color && item.color.type === 'text' && (
                <span style={{ color: item.color.color }}>A</span>
              )}
              {item.color && item.color.type === 'highlight' && (
                <>
                  {Icon && <Icon fill={item.color.color} size={16} />}
                </>
              )}
              {!item.color && (
                <>
                  {Icon && <Icon size={16} />}
                </>
              )}

              <span>{item.label}</span>
            </DropdownMenu.Item>
          );
        })}
    </>
  );
}
