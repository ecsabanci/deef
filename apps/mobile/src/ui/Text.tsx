import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "../theme/theme-store";
import type { typography } from "../theme/tokens";

interface TextProps extends RNTextProps {
  variant?: keyof typeof typography;
  color?: "primary" | "secondary" | "accent" | "error";
}

export function Text({
  variant = "body",
  color = "primary",
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const colorValue = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    accent: theme.colors.accent,
    error: theme.colors.error,
  }[color];
  return (
    <RNText
      style={[theme.typography[variant], { color: colorValue }, style]}
      {...rest}
    />
  );
}
