"use client";

import { createContext, useContext } from "react";

export interface AppShellContextValue {
  // Populated progressively as more issues are completed
  addEntry: (type: "transaction" | "account", identifier: string, summary?: string) => void;
  isSaved: (address: string) => boolean;
  getEntry: (address: string) => { id: string; label: string } | undefined;
  saveAddress: (label: string, address: string) => boolean;
  removeAddress: (id: string) => void;
  copy: (text: string) => void;
  personalise: (text: string) => string;
  isPersonalModeActive: boolean;
}

// Safe default stubs so pages compile without errors
// even before the real implementations are wired in
const defaultValue: AppShellContextValue = {
  addEntry: () => {},
  isSaved: () => false,
  getEntry: () => undefined,
  saveAddress: () => false,
  removeAddress: () => {},
  copy: (text) => { navigator.clipboard.writeText(text).catch(() => null); },
  personalise: (text) => text,
  isPersonalModeActive: false,
};

export const AppShellContext = createContext<AppShellContextValue>(defaultValue);

export function useAppShell(): AppShellContextValue {
  return useContext(AppShellContext);
}