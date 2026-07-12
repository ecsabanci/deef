import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button, Card, Skeleton, Text } from "../ui";
import { useTheme, useThemeStore, type ThemePreference } from "../theme/theme-store";

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

// TEMPORARY demo screen for tasks 9.3/9.4 — replaced by the feed screen
// in checkpoint 10.
export function UiKitDemo() {
  const theme = useTheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
    >
      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.xs }}>
        <Text variant="title">deef UI kit</Text>
        <Text variant="body" color="secondary">
          Tema: {preference} → {theme.mode}
        </Text>
      </View>

      <Button
        label="Temayı değiştir"
        onPress={() => setPreference(NEXT_PREFERENCE[preference])}
      />
      <Button label="İkincil buton" variant="ghost" onPress={() => {}} />

      <Card style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="heading">Kart başlığı</Text>
        <Text variant="body" color="secondary">
          Kart gövdesi — feed kartlarının temeli bu bileşen olacak.
        </Text>
        <Text variant="caption" color="accent">
          AI ile üretildi
        </Text>
      </Card>

      <Card style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Skeleton height={180} radius={12} />
        <Skeleton width="70%" height={20} />
        <Skeleton width="40%" height={14} />
      </Card>

      <Text variant="caption" color="error">
        Hata metni örneği
      </Text>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </ScrollView>
  );
}
