import { useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui";
import { useTheme, useThemeStore } from "../theme/theme-store";

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
  const setPreference = useThemeStore((state) => state.setPreference);
  const isDark = theme.mode === "dark";

  // Rotate + pop the glyph on toggle; the theme flips immediately and the
  // sun/moon swaps mid-spin. Core Animated (reanimated lands in cp 11).
  const spin = useRef(new Animated.Value(0)).current;
  const onToggle = () => {
    setPreference(isDark ? "light" : "dark");
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const scale = spin.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  });

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="masthead">deef</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.smd,
        }}
      >
        <Text variant="caption" color="secondary">
          {todayLineTr()}
        </Text>
        {/* The one permitted masthead icon (DESIGN.md): explicit theme
            override. Uses textPrimary, never accent. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Temayı değiştir"
          hitSlop={12}
          onPress={onToggle}
        >
          <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
            <Feather
              name={isDark ? "moon" : "sun"}
              size={20}
              color={theme.colors.textPrimary}
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
