'use client'
import { ThemeImage } from '@/components/theme-image';

export const LogoImage = () => {
  const imageSizePixels = 267;
  return (
    <ThemeImage
      srcDark="/ethereal-nexus-logo-dark-mode.jpg"
      srcLight="/ethereal-nexus-logo-light-mode.jpg"
      alt="Ethereal Nexus Logo"
      width={imageSizePixels}
      height={imageSizePixels / 9}
    />
  )
};

export default LogoImage;
