import { QueryClient } from "@tanstack/react-query";

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
