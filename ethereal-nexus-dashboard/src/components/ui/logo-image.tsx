'use client'
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
export const LogoImage = () => {
  const imageSizePixels = 267;
  const {theme} = useTheme();
  const logoWithSystemColor = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches ? '/ethereal-nexus-logo-dark-mode.jpg' : '/ethereal-nexus-logo-light-mode.jpg';
  const [image, setImage] = useState(logoWithSystemColor);

  useEffect(() => {
    theme === 'system' ?  setImage(logoWithSystemColor) : setImage(`/ethereal-nexus-logo-${theme}-mode.jpg`);
  }, [theme]);

  return <Image data-testid={`ethereal-logo-${theme}-image`} src={image} alt="Ethereal Nexus Logo" width={imageSizePixels} height={imageSizePixels/9}/>;
};

export default LogoImage;
