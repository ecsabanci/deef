import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { useTheme } from "../theme/theme-store";
import { Text } from "./Text";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: "primary" | "ghost";
}

export function Button({ label, variant = "primary", ...rest }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? theme.colors.accent : "transparent",
        borderColor: theme.colors.border,
        // DESIGN.md: radius 4, hairline ghost border, ≥44 touch target
        borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
        borderRadius: theme.radii.xs,
        minHeight: 44,
        justifyContent: "center",
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        alignItems: "center",
        opacity: pressed ? 0.7 : 1,
      })}
      {...rest}
    >
      <Text
        variant="body"
        style={{
          color: isPrimary ? theme.colors.onAccent : theme.colors.textPrimary,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
