import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { EditorNode } from './classes';
import type { RecentType } from '../../../Shared/types';
import type { SetStateAction } from 'react';
import { MenuItemsRenderer } from '../../../Shared';

interface INodeDropdownContent {
  node: EditorNode;
  recent?: RecentType;
  setRecent?: React.Dispatch<SetStateAction<RecentType>>
}

export function NodeDropdownContent({ node }: INodeDropdownContent) {
  const items = node.getMenuItems();

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className="dropdown-menu active"
        sideOffset={6}
        side='left'
      >
        <MenuItemsRenderer items={items} />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}
