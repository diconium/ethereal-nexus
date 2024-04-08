import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Theme, themeStore } from '@/lib/theme.ts';
import { initialTheme } from '@/components/theme-toggle.tsx';

export const LogoImage = () => {
  const $theme = useStore(themeStore);

  const logoWithSystemColor =
    initialTheme() === Theme.DARK ? '/logo_dark.png' : '/logo_light.png';

  const [image, setImage] = useState(logoWithSystemColor);

  useEffect(() => {
    setImage(`/logo_${$theme}.png`);
  }, [$theme]);

  return (
    <img
      data-testid={`logo-${$theme}`}
      src={image}
      alt="Ethereal Nexus Logo"
      className="h-4 self-end justify-self-end"
    />
  );
};

export default LogoImage;
