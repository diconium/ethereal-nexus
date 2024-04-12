import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '@/lib/theme.ts';

export const LogoImageSite = () => {
  const $theme = useStore(themeStore);
  const [image, setImage] = useState(`/ethereal-nexus-logo-${$theme}-mode.jpg`);

  useEffect(() => {
    setImage(`/ethereal-nexus-logo-${$theme}-mode.jpg`);
  }, [$theme]);

  return (
    <div>
      <img
        src={image}
        alt="Ethereal Nexus Logo"
        className="h-4 self-end justify-self-end"
      />
    </div>
  );
};

export default LogoImageSite;
