import Content from "./components/Content";
import DropdownBase from "./components/DropdownBase";
import Item from "./components/Item";
import Trigger from "./components/Trigger";
import Group from "./components/Group";
import type { DropdownComponent } from "./components/types";
import Select from "./components/select";

const Dropdown = DropdownBase as DropdownComponent;

Dropdown.Content = Content;
Dropdown.Item = Item;
Dropdown.Trigger = Trigger;
Dropdown.Group = Group;

export {
  Dropdown,
  Select
};
