import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '@/lib/theme.ts';

import lightModeImage from "../assets/ethereal-nexus-logo-light-mode.jpg";
import darkModeImage from "../assets/ethereal-nexus-logo-dark-mode.jpg";


export const LogoImageSite = () => {
  const $theme = useStore(themeStore);
  const [image, setImage] = useState(lightModeImage.src);

  useEffect(() => {
      if($theme === 'light') {
        setImage(lightModeImage.src);
      } else {
        setImage(darkModeImage.src);
      }
  }, [$theme]);

  return (
    <div>
        {$theme == 'light' ? (<img
            src={image}
            alt="Ethereal Nexus Logo"
            className="h-4 self-end justify-self-end"
        />) : <img
            src={image}
            alt="Ethereal Nexus Logo"
            className="h-4 self-end justify-self-end"
        />}

    </div>
  );
};

export default LogoImageSite;
