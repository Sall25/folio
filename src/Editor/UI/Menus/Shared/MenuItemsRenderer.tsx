import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { type MenuItem } from "../types";
import { ChevronRight } from 'lucide-react';
import { Button, ButtonGroup } from '../../Components';
import { CardGroupLabel, CardItemGroup } from '../../Components/card';
import { Separator } from '../../Components/separator';

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
                <DropdownMenu.SubTrigger
                  style={{
                    outline: 'none'
                  }}
                >

                  <Button
                    style={{

                      display: 'flex',
                      justifyContent: 'space-between',
                      minWidth: '200px',
                      cursor: 'pointer'

                    }}
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
                      {/* <CardGroupLabel>
                     
                    </CardGroupLabel>
                    <CardGroupLabel
                      style={{
                        fontSize: '14px'
                      }}
                    >
                     
                    </CardGroupLabel> */}

                    </CardItemGroup>

                    <CardGroupLabel>
                      <ChevronRight
                        className='tiptap-button-icon-sub'
                        size={16} />
                    </CardGroupLabel>
                  </Button>


                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal >
                  <DropdownMenu.SubContent
                    className='tiptap-card'
                    style={{
                      justifyContent: 'left',
                      alignItems: 'flex-start',
                      minWidth: '200px',
                      gap: '8px',
                      padding: '10px'
                    }}
                  >
                    {/* 🔥 RECURSION HAPPENS HERE */}
                    <MenuItemsRenderer items={item.content} />
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            );
          }

          if (item.type === "Separator") {
            return <Separator key={index} orientation='horizontal' />
          }

          if (item.type === "Title") {
            return (
              <CardGroupLabel key={index}>
                {item.label}
              </CardGroupLabel>
              // <DropdownMenu.Label className="dropdown-title">

              // </DropdownMenu.Label>
            );
          }


          return (
            <DropdownMenu.Item
              key={index}
              className="tiptap-button"
              onSelect={() => {
                item.action?.();
              }}
            >
              <CardItemGroup
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
              </CardItemGroup>
            </DropdownMenu.Item>
          );
        })}
    </>
  );
}
