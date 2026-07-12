import { useColorScheme } from "react-native";
import { create } from "zustand";
import { darkTheme, lightTheme, type Theme, type ThemeMode } from "./tokens";

// "system" follows the OS; light/dark are manual overrides kept for the
// future settings screen (DECISIONS.md 2026-07-12, Phase 4 decisions)
export type ThemePreference = "system" | ThemeMode;

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  setPreference: (preference) => set({ preference }),
}));

export function useTheme(): Theme {
  const preference = useThemeStore((state) => state.preference);
  const systemScheme = useColorScheme();
  const mode: ThemeMode =
    preference === "system" ? (systemScheme ?? "light") : preference;
  return mode === "dark" ? darkTheme : lightTheme;
}
