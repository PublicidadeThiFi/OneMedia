import { createContext, useContext } from 'react';

export type NavigateFunction = (path: string) => void;

export const NavigationContext = createContext<NavigateFunction>(() => {});

export const useNavigation = () => useContext(NavigationContext);
