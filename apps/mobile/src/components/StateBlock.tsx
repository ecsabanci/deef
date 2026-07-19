import { View } from "react-native";
import { Button, Text } from "../ui";
import { useTheme } from "../theme/theme-store";

interface StateBlockProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// DESIGN.md Error/Empty/Offline recipe: centered column, serif heading,
// secondary one-liner, optional ghost retry button. No illustrations, no
// emoji.
export function StateBlock({
  title,
  message,
  actionLabel,
  onAction,
}: StateBlockProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <Text variant="headline" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {message !== undefined && (
        <Text
          variant="body"
          color="secondary"
          style={{ textAlign: "center", maxWidth: 260 }}
        >
          {message}
        </Text>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <Button label={actionLabel} variant="ghost" onPress={onAction} />
      )}
    </View>
  );
}
