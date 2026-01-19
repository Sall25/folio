
import { createContext } from "react";
import { type NavigationContextType } from "./types";


export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);
