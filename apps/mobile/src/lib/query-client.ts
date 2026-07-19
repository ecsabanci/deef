import { onlineManager, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";

// Reflect device connectivity into TanStack Query: queries pause while
// offline and refetch on reconnect (DESIGN.md offline handling).
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected ?? false);
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Feed content changes on a 15-min pipeline cadence; a minute of
      // staleness is invisible to the reader and saves refetch churn
      staleTime: 60_000,
      retry: 2,
    },
  },
});
