'use client';
import Image, { ImageProps } from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Props = Omit<ImageProps, 'src' | 'priority' | 'loading'> & {
  srcLight: string
  srcDark: string
}

export const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;
  const { resolvedTheme } = useTheme();
  const [imageSrc, setImageSrc] = useState(resolvedTheme === 'dark' ? srcDark : srcLight);

  useEffect(() => {
    setImageSrc(resolvedTheme === 'dark' ? srcDark : srcLight);
  }, [resolvedTheme]);

  return <Image {...rest} src={imageSrc} />;

};
