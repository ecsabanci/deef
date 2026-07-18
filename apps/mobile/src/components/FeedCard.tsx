import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "../ui";
import { useTheme } from "../theme/theme-store";
import { formatRelativeTr } from "../lib/relative-time";
import type { FeedEvent } from "../hooks/usePublishedEvents";

interface FeedCardProps {
  event: FeedEvent;
  categoryName: string;
  onPress: () => void;
}

// DESIGN.md Feed Card recipe: no surface, no border, no shadow — the page
// is the card. Meta row stays neutral (accent exclusivity: the tab
// underline owns the accent in this region).
export function FeedCard({ event, categoryName, onPress }: FeedCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Image
        source={{ uri: event.cover_image_url }}
        accessibilityLabel={event.cover_image_alt ?? event.title}
        // 3:4 portrait, full-bleed, radius 0 (DESIGN.md imagery rules)
        style={{
          width: "100%",
          aspectRatio: 3 / 4,
          borderRadius: theme.radii.none,
          backgroundColor: theme.colors.skeleton,
        }}
        contentFit="cover"
        transition={200}
      />
      <View style={{ marginTop: theme.spacing.smd, gap: theme.spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.xs }}>
          <Text variant="label" color="secondary">
            {categoryName}
          </Text>
          <Text variant="caption" color="secondary">
            · {formatRelativeTr(event.published_at)}
          </Text>
        </View>
        <Text variant="headline" numberOfLines={3}>
          {event.title}
        </Text>
        <Text variant="caption" color="secondary">
          Görsel yapay zekâ ile üretildi
        </Text>
      </View>
    </Pressable>
  );
}
