// Fix: memoize AppShell context value to stop refetch loops (#1311)
'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';
interface AppShellContextValue { network: string; setNetwork: (n: string) => void; }
const AppShellContext = createContext<AppShellContextValue>({ network: 'mainnet', setNetwork: () => {} });
export function useAppShell() { return useContext(AppShellContext); }
export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState('mainnet');
  const value = useMemo(() => ({ network, setNetwork }), [network]);
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}
