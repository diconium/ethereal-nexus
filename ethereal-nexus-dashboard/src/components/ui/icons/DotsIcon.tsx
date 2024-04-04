import React from 'react';
import { IconJSXProps } from '@/utils/entities/icon';

export default function DotsIcon({ width, height, fill = 'currentColor' }: IconJSXProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 32 32`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      fill="none">
        <circle cx="16" cy="16" r="16" fill="#EDEDF5" />
        <circle cx="8" cy="16" r="2" fill="#575758" />
        <circle cx="16" cy="16" r="2" fill="#575758" />
        <circle cx="24" cy="16" r="2" fill="#575758" />
    </svg>
  );
}
