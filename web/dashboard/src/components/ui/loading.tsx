'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { RingLoader } from 'react-spinners';

export const Loading = ({ children }: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(true);
  const { resolvedTheme} = useTheme();

  useEffect(() => {
    if(resolvedTheme !== undefined) {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }, [resolvedTheme]);

  return loading ?
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" data-testid="global-loader">
      <RingLoader size={100} color={'#FF5600'} loading={loading} />
    </div>
    : <div>{children}</div>;
};
