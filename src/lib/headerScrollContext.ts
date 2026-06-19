import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export const HEADER_ROW_HEIGHT = 60;

export const HeaderScrollContext = createContext<SharedValue<number> | null>(null);

export function useHeaderScrollY(): SharedValue<number> | null {
  return useContext(HeaderScrollContext);
}
