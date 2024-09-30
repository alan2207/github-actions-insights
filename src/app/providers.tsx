"use client";

import { QueryClient } from "@tanstack/react-query";
import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { get, set, del } from "idb-keyval";
import {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export function createIDBPersister(idbValidKey: IDBValidKey = "reactQuery") {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } as Persister;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            gcTime: 6 * 60 * 60 * 1000, // 6 hours
          },
        },
      })
  );

  return (
    <PersistQueryClientProvider
      persistOptions={{
        persister: createIDBPersister(),
        maxAge: 6 * 60 * 60 * 1000,
      }}
      client={queryClient}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
