'use client'
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
const LogoImage = () => {
  const imageSizePixels = 267;
  const {theme} = useTheme();
  const [image, setImage] = useState('/ethereal-nexus-logo-dark-mode.jpg');

  useEffect(() => {
    setImage(`/ethereal-nexus-logo-${theme}-mode.jpg`);
  }, [theme]);

  return <Image src={image} alt="Ethereal Nexus Logo" width={imageSizePixels} height={imageSizePixels/9}/>;
};

export default LogoImage;
