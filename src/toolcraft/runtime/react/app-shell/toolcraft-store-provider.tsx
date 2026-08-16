"use client";

import * as React from "react";
import { Provider as JotaiProvider } from "jotai";

import type { ToolcraftStore } from "../../state/store";

const ToolcraftStoreIdentityContext = React.createContext<ToolcraftStore | null>(null);

export function ToolcraftStoreProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store: ToolcraftStore;
}): React.JSX.Element {
  return (
    <ToolcraftStoreIdentityContext.Provider value={store}>
      <JotaiProvider store={store.jotai}>{children}</JotaiProvider>
    </ToolcraftStoreIdentityContext.Provider>
  );
}

export function useToolcraftStoreIdentity(): ToolcraftStore {
  const store = React.useContext(ToolcraftStoreIdentityContext);

  if (!store) {
    throw new Error("Toolcraft hooks must be used inside ToolcraftRoot");
  }

  return store;
}
