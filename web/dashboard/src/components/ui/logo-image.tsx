'use client'
import Image from 'next/image';

export const LogoImage = () => {
  const imageSizePixels = 267;
  return (
    <Image
      src="/ethereal-nexus-logo-dark-mode.jpg"
      alt="Ethereal Nexus Logo"
      className="filter invert hue-rotate-180 dark:filter-none"
      data-testid="ethereal-logo"
      width={imageSizePixels}
      height={0}
      sizes="100vw"
      priority
    />
  )
};

export default LogoImage;
