import { Pressable, type PressableProps } from "react-native";
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
        borderWidth: isPrimary ? 0 : 1,
        borderRadius: theme.radii.full,
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
