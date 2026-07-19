import { useMemo, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNetworkState } from "expo-network";
import { FlashList } from "@shopify/flash-list";
import { Masthead } from "../components/Masthead";
import { CategoryTabs } from "../components/CategoryTabs";
import { FeedCard } from "../components/FeedCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { StateBlock } from "../components/StateBlock";
import {
  NewsDetailSheet,
  type NewsDetailSheetRef,
} from "../components/NewsDetailSheet";
import {
  SourceWebSheet,
  type SourceWebSheetRef,
} from "../components/SourceWebSheet";
import { useTheme } from "../theme/theme-store";
import { useCategories } from "../hooks/useCategories";
import { usePublishedEvents, type FeedEvent } from "../hooks/usePublishedEvents";

// Story separator: whitespace + a centered hairline column rule
function Separator() {
  const theme = useTheme();
  return (
    <View style={{ height: theme.spacing.xl, justifyContent: "center" }}>
      <View
        style={{
          alignSelf: "center",
          width: "35%",
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
        }}
      />
    </View>
  );
}

export function FeedScreen() {
  const theme = useTheme();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const categories = useCategories();
  const events = usePublishedEvents(categoryId);
  const network = useNetworkState();
  const isOffline =
    network.isConnected === false || network.isInternetReachable === false;

  const allEvents = useMemo(
    () => events.data?.pages.flatMap((page) => page.events) ?? [],
    [events.data],
  );
  const categoryNameById = useMemo(
    () =>
      new Map((categories.data ?? []).map((c) => [c.id, c.name_tr] as const)),
    [categories.data],
  );
  const detailRef = useRef<NewsDetailSheetRef>(null);
  const sourceRef = useRef<SourceWebSheetRef>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Masthead />
      <CategoryTabs
        categories={categories.data ?? []}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <View style={{ flex: 1 }}>
      {isOffline && allEvents.length === 0 ? (
        // Offline with nothing cached; cached data stays readable offline
        <StateBlock
          title="Bağlantı yok"
          message="İnternet bağlantını kontrol edip tekrar dene."
          actionLabel="Tekrar dene"
          onAction={() => void events.refetch()}
        />
      ) : events.isLoading ? (
        // Cold start: pulsing story placeholders (DESIGN.md)
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xl }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : events.isError ? (
        <StateBlock
          title="Bir şeyler ters gitti"
          message="İçerik yüklenemedi. Lütfen tekrar dene."
          actionLabel="Tekrar dene"
          onAction={() => void events.refetch()}
        />
      ) : allEvents.length === 0 ? (
        <StateBlock
          title={
            categoryId === null
              ? "Henüz haber yok"
              : "Bu kategoride henüz haber yok"
          }
          message="Yeni haberler geldikçe burada görünecek."
        />
      ) : (
        <FlashList
          data={allEvents}
          keyExtractor={(item: FeedEvent) => String(item.id)}
          renderItem={({ item }) => (
            <FeedCard
              event={item}
              categoryName={categoryNameById.get(item.category_id) ?? ""}
              onPress={() =>
                detailRef.current?.present(
                  item,
                  categoryNameById.get(item.category_id) ?? "",
                )
              }
            />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ padding: theme.spacing.md }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (events.hasNextPage && !events.isFetchingNextPage) {
              void events.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={events.isRefetching && !events.isFetchingNextPage}
              onRefresh={() => void events.refetch()}
              tintColor={theme.colors.accent}
            />
          }
          ListFooterComponent={
            events.isFetchingNextPage ? (
              <View style={{ paddingTop: theme.spacing.xl }}>
                <SkeletonCard />
              </View>
            ) : null
          }
        />
      )}
      </View>
      <NewsDetailSheet
        ref={detailRef}
        onOpenSource={(url) => sourceRef.current?.present(url)}
      />
      <SourceWebSheet ref={sourceRef} />
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </View>
  );
}
