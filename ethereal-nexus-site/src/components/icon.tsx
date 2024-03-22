'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Theme, themeStore } from '@/lib/theme.ts';
import { type IconProps, Icons } from '@/icons';

export function SvgIcon({
  name,
  ...props
}: {
  name: string;
  props: IconProps;
}) {
  const [color, setColor] = useState<string>('');
  const $theme = useStore(themeStore);

  useEffect(() => {
    setColor($theme == Theme.DARK ? 'white' : 'black');
  }, [$theme]);

  const IconElement = Icons[name];

  return <IconElement fill={color} color={color} {...props} />;
}
