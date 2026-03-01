import { type MenuItem } from "./types";
import { ChevronRight } from 'lucide-react';
import { CardGroupLabel, CardItemGroup } from '../../Components/card';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,

} from '../dropdown-menu/dropdown-menu';
import { Separator } from "../separator";

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
              <DropdownMenuSub key={index}>
                <DropdownMenuSubTrigger
                  style={{
                    outline: 'none'
                  }}
                  className="tiptap-button"
                >
                  <CardItemGroup
                    orientation='horizontal'

                  >
                    {Icon && <Icon className="tiptap-button-icon" size={16} />}
                    <CardGroupLabel
                      style={{
                        fontSize: '14px'
                      }}
                    >
                      {item.label}
                    </CardGroupLabel>

                  </CardItemGroup>

                  <CardGroupLabel>
                    <ChevronRight
                      className='tiptap-button-icon-sub'
                      size={16} />
                  </CardGroupLabel>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className='tiptap-card'
                  style={{
                    justifyContent: 'left',
                    alignItems: 'flex-start',
                    minWidth: '200px',
                    gap: '8px',
                    padding: '10px'
                  }}
                >
                  {/* RECURSION HAPPENS HERE */}
                  <MenuItemsRenderer items={item.content} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          if (item.type === "Separator") {
            return <Separator orientation="horizontal"
              // className='tiptap-separator'
              key={index}
            />
          }

          if (item.type === "Title") {
            return (
              <CardGroupLabel key={index}>
                {item.label}
              </CardGroupLabel>

            );
          }


          return (
            <DropdownMenuItem
              key={index}
              className="tiptap-button"
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

              {/* <CardItemGroup
                orientation='horizontal'
                style={{
                  cursor: 'pointer'
                }}
              >

                <CardItemGroup>
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
                </CardItemGroup>

                <CardGroupLabel
                  style={{
                    fontSize: '14px'
                  }}
                >
                  <span>{item.label}</span>
                </CardGroupLabel>
              </CardItemGroup> */}
            </DropdownMenuItem>
          );
        })}
    </>
  );
}
