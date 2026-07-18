import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui";
import { useTheme } from "../theme/theme-store";

// "12 Temmuz, Cumartesi" — the broadsheet date line
function todayLineTr(): string {
  const now = new Date();
  const dayMonth = now.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
  });
  const weekday = now.toLocaleDateString("tr-TR", { weekday: "long" });
  return `${dayMonth}, ${weekday}`;
}

export function Masthead() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="masthead">deef</Text>
      <Text variant="caption" color="secondary">
        {todayLineTr()}
      </Text>
    </View>
  );
}
