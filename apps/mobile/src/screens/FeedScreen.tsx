import { useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { FlashList } from "@shopify/flash-list";
import { Masthead } from "../components/Masthead";
import { CategoryTabs } from "../components/CategoryTabs";
import { FeedCard } from "../components/FeedCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { Text } from "../ui";
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

  const allEvents = useMemo(
    () => events.data?.pages.flatMap((page) => page.events) ?? [],
    [events.data],
  );
  const categoryNameById = useMemo(
    () =>
      new Map((categories.data ?? []).map((c) => [c.id, c.name_tr] as const)),
    [categories.data],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Masthead />
      <CategoryTabs
        categories={categories.data ?? []}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <View style={{ flex: 1 }}>
      {events.isLoading ? (
        // Cold start: three pulsing story placeholders (DESIGN.md)
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xl }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : events.isError ? (
        // Interim error text — proper state blocks land in task 10.3
        <View style={{ padding: theme.spacing.lg }}>
          <Text color="error">Bir şeyler ters gitti: {events.error.message}</Text>
        </View>
      ) : (
        <FlashList
          data={allEvents}
          keyExtractor={(item: FeedEvent) => String(item.id)}
          renderItem={({ item }) => (
            <FeedCard
              event={item}
              categoryName={categoryNameById.get(item.category_id) ?? ""}
              onPress={() => {
                // Detail bottom sheet arrives in checkpoint 11
              }}
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
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </View>
  );
}
