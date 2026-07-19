import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface FeedEvent {
  id: number;
  category_id: number;
  title: string;
  summary: string;
  eli5_text: string | null;
  cover_image_url: string;
  cover_image_alt: string | null;
  importance: number;
  published_at: string;
  source_url: string | null;
}

const PAGE_SIZE = 20;

// Feed ordering (DECISIONS.md 2026-07-12): today's stories by importance
// desc, older content by published_at desc. PostgREST can't express that
// in one ORDER BY, so the infinite query walks two phases: "today"
// (importance-ordered) until exhausted, then "older" (freshness-ordered).
type PageParam =
  | { phase: "today"; offset: number }
  | { phase: "older"; offset: number };

interface FeedPage {
  events: FeedEvent[];
  param: PageParam;
}

// Device-local midnight: "today" means the reader's today
function todayStartIso(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function fetchPage(
  param: PageParam,
  categoryId: number | null,
): Promise<FeedPage> {
  const todayStart = todayStartIso();
  let query = supabase
    .from("events")
    .select(
      "id, category_id, title, summary, eli5_text, cover_image_url, " +
        "cover_image_alt, importance, published_at, source_url",
    );
  if (categoryId !== null) {
    query = query.eq("category_id", categoryId);
  }
  query =
    param.phase === "today"
      ? query
          .gte("published_at", todayStart)
          .order("importance", { ascending: false })
          .order("published_at", { ascending: false })
      : query
          .lt("published_at", todayStart)
          .order("published_at", { ascending: false });

  const { data, error } = await query.range(
    param.offset,
    param.offset + PAGE_SIZE - 1,
  );
  if (error) throw new Error(error.message);
  // Concatenated select string defeats supabase-js literal-type parsing;
  // FeedEvent mirrors the selected columns
  return { events: (data ?? []) as unknown as FeedEvent[], param };
}

export function usePublishedEvents(categoryId: number | null) {
  const query = useInfiniteQuery({
    queryKey: ["published-events", categoryId],
    initialPageParam: { phase: "today", offset: 0 } as PageParam,
    queryFn: ({ pageParam }) => fetchPage(pageParam, categoryId),
    getNextPageParam: (lastPage): PageParam | undefined => {
      const { param, events } = lastPage;
      if (param.phase === "today") {
        // A full page may hide more of today; a short page hands over to
        // the older phase (one possibly-short page is fine for FlashList)
        return events.length === PAGE_SIZE
          ? { phase: "today", offset: param.offset + PAGE_SIZE }
          : { phase: "older", offset: 0 };
      }
      return events.length === PAGE_SIZE
        ? { phase: "older", offset: param.offset + PAGE_SIZE }
        : undefined;
    },
  });

  // Auto-advance past empty leading pages. The "today" phase can be empty
  // (e.g. before the day's first publish), which would otherwise strand
  // all the older, already-published events behind an empty first page —
  // onEndReached never fires on an empty list. Stops as soon as a page
  // yields events or pages are exhausted.
  const loadedCount =
    query.data?.pages.reduce((sum, page) => sum + page.events.length, 0) ?? 0;
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = query;
  useEffect(() => {
    if (loadedCount === 0 && hasNextPage && !isFetchingNextPage && !isLoading) {
      void fetchNextPage();
    }
  }, [loadedCount, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  return query;
}
