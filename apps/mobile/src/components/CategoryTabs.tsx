import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../ui";
import { useTheme } from "../theme/theme-store";
import { toTrUpper } from "../lib/turkish";
import type { Category } from "../hooks/useCategories";

interface CategoryTabsProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

// Text-only editorial tabs: active gets the accent underline — the ONLY
// accent element in the feed region (DESIGN.md accent exclusivity)
export function CategoryTabs({
  categories,
  selectedId,
  onSelect,
}: CategoryTabsProps) {
  const theme = useTheme();
  const tabs = [
    { id: null as number | null, label: "Tümü" },
    ...categories.map((category) => ({
      id: category.id as number | null,
      label: category.name_tr,
    })),
  ];
  return (
    <View
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
      >
        {tabs.map((tab) => {
          const active = tab.id === selectedId;
          return (
            <Pressable
              key={tab.id ?? "all"}
              accessibilityRole="tab"
              onPress={() => onSelect(tab.id)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.smd,
                borderBottomWidth: 2,
                borderBottomColor: active
                  ? theme.colors.accent
                  : "transparent",
              }}
            >
              <Text
                variant="label"
                style={{
                  color: active
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                }}
              >
                {toTrUpper(tab.label)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
