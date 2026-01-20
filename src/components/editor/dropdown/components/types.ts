import type { FC, ReactNode } from 'react';
import Trigger from './Trigger';
import Content from './Content';
import Item from './Item';
import type Group from './Group';

export type DropdownComponent = FC<{ children: ReactNode }> & {
  Trigger: typeof Trigger;
  Content: typeof Content;
  Item: typeof Item;
  Group: typeof Group
};
