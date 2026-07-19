import { View } from "react-native";
import { Skeleton } from "../ui";
import { useTheme } from "../theme/theme-store";

// Mirrors the FeedCard anatomy (DESIGN.md Skeleton Card recipe)
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.smd }}>
      <View style={{ aspectRatio: 3 / 4, width: "100%" }}>
        <Skeleton width="100%" height="100%" radius={theme.radii.none} />
      </View>
      <Skeleton width="70%" height={22} />
      <Skeleton width="40%" height={12} />
    </View>
  );
}
