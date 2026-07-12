import { Pressable, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/theme-store";

interface CardProps extends ViewProps {
  onPress?: () => void;
}

export function Card({ onPress, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden" as const,
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.85 : 1 }, style]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}
