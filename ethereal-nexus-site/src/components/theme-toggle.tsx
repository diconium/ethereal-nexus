import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useMounted } from '@/lib/use-monted';
import { Theme, themeStore } from '@/lib/theme.ts';

const SunIcon = () => (
  <>
    <motion.svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: 0,
        transition: { duration: 0.2, type: 'spring', stiffness: 100 },
      }}
      exit={{
        scale: 0.5,
        opacity: 0,
        rotate: 90,
        transition: { duration: 0.2 },
      }}
    >
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </motion.svg>
  </>
);

const MoonIcon = () => (
  <>
    <motion.svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: 0,
        transition: { duration: 0.2, type: 'spring', stiffness: 100 },
      }}
      exit={{
        scale: 0.5,
        opacity: 0,
        rotate: 90,
        transition: { duration: 0.2 },
      }}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </motion.svg>
  </>
);

export const initialTheme = (): Theme => {
  if (import.meta.env.SSR) {
    return Theme.LIGHT;
  }
  if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
    return localStorage.getItem('theme') as Theme;
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return Theme.DARK;
  }

  return Theme.LIGHT;
};
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme());

  useEffect(() => {
    themeStore.set(theme);
  }, []);

  const toggleTheme = () => {
    const t = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    localStorage.setItem('theme', t);
    setTheme(t);
    themeStore.set(t);
  };

  const mounted = useMounted();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === Theme.DARK) {
      root.classList.remove(Theme.LIGHT);
      root.classList.add(Theme.DARK);
    } else {
      root.classList.remove(Theme.DARK);
      root.classList.add(Theme.LIGHT);
    }
  }, [theme]);

  return mounted ? (
    <button
      role="button"
      onClick={toggleTheme}
      className="min-h-[40px] -mr-2 block focus:outline-none"
    >
      <span className="sr-only">Toggle mode</span>
      <AnimatePresence initial={false}>
        {theme !== Theme.DARK ? <SunIcon /> : <MoonIcon />}
      </AnimatePresence>
    </button>
  ) : (
    <div />
  );
}
