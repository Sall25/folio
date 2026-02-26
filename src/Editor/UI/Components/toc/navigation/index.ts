import Content from "./Content";
import Item from "./Item";
import { NavigationBase } from "./NavigationBase";
import Trigger from "./Trigger";
import {
  type NavigationComponent
} from './NavigationComponent'


const Navigation = NavigationBase as NavigationComponent;

Navigation.Trigger = Trigger;
Navigation.Content = Content;
Navigation.Item = Item;

export {
  Navigation
};


