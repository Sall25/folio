import Trigger from "./components/Trigger";
import SelectBase from "./components/SelectBase";
import Option from "./components/Option";
import Content from "./components/Content";
import { type SelectComponent } from "./types";

const Select = SelectBase as SelectComponent;

Select.Trigger = Trigger;
Select.Option = Option;
Select.Content = Content;


export default Select;