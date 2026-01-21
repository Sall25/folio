
import Content from "./components/Content";
import Item from "./components/Item";
import { NavigationBase } from "./components/NavigationBase";
import { type NavigationComponent } from "./components/NavigationComponent";
import Trigger from "./components/Trigger";

const Navigation = NavigationBase as NavigationComponent;

Navigation.Trigger = Trigger;
Navigation.Content = Content;
Navigation.Item = Item;

export {
  Navigation
};


