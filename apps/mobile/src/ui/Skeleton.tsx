import { useEffect, useRef } from "react";
import { Animated, type DimensionValue } from "react-native";
import { useTheme } from "../theme/theme-store";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}

// Pulsing placeholder block. Uses core Animated (no reanimated dependency
// yet — that arrives with the bottom sheet in checkpoint 11).
export function Skeleton({ width = "100%", height = 16, radius }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radii.sm,
        backgroundColor: theme.colors.skeleton,
        opacity,
      }}
    />
  );
}
