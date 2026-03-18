'use client';

import React, { createContext, useContext, useState } from 'react';

type HeaderSlotContextValue = {
  breadcrumb: React.ReactNode;
  setBreadcrumb: (node: React.ReactNode) => void;
};

const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  breadcrumb: null,
  setBreadcrumb: () => {},
});

export function HeaderSlotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [breadcrumb, setBreadcrumb] = useState<React.ReactNode>(null);

  return (
    <HeaderSlotContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}
