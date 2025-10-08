import React from 'react';
import { Provider, defaultTheme, darkTheme } from '@adobe/react-spectrum';

interface SpectrumProviderProps {
  children: React.ReactNode;
  colorScheme?: 'light' | 'dark';
}

export const SpectrumProvider: React.FC<SpectrumProviderProps> = ({
  children,
  colorScheme = 'light'
}) => {
  return (
    <Provider
      theme={colorScheme === 'dark' ? darkTheme : defaultTheme}
      colorScheme={colorScheme}
      scale="medium"
    >
      {children}
    </Provider>
  );
};
