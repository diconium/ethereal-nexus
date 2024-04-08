import { atom } from 'nanostores';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export const themeStore = atom(Theme.LIGHT);
