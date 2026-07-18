// Design tokens — the only place raw values live, per docs/DESIGN.md
// (BINDING). Components must consume these through useTheme(); no raw
// hex/sizes in component files.
import type { TextStyle } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

// Radius discipline (DESIGN.md): covers 0, chips/buttons/skeletons 4,
// sheet 12, nothing above 12. `full` survives for future use but is
// BANNED in broadsheet chrome — no pills.
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

// Fraunces loaded via @expo-google-fonts/fraunces (DECISIONS.md
// 2026-07-12); serif is for headlines/masthead ONLY, never body/UI
export const fonts = {
  serifSemiBold: "Fraunces_600SemiBold",
  serifBold: "Fraunces_700Bold",
} as const;

export const typography = {
  masthead: {
    fontFamily: fonts.serifBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  headline: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  heading: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: "400" },
  label: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
} as const satisfies Record<string, TextStyle>;

export interface ColorTokens {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  border: string;
  skeleton: string;
  error: string;
  backdrop: string;
}

// "Ink on paper" (DESIGN.md light palette)
const lightColors: ColorTokens = {
  background: "#F6F1E8",
  surface: "#EDE6D9",
  textPrimary: "#221D16",
  textSecondary: "#71685B",
  accent: "#BC4B26",
  onAccent: "#F6F1E8",
  border: "#D9D0C0",
  skeleton: "#E6DECF",
  error: "#A93226",
  backdrop: "rgba(24,20,16,0.55)",
};

// "Paper on ink" (DESIGN.md dark palette)
const darkColors: ColorTokens = {
  background: "#181410",
  surface: "#221D16",
  textPrimary: "#EDE6D9",
  textSecondary: "#A79C8A",
  accent: "#E06A3F",
  onAccent: "#181410",
  border: "#3A332A",
  skeleton: "#2A241C",
  error: "#E37B6B",
  backdrop: "rgba(24,20,16,0.55)",
};

export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fonts: typeof fonts;
}

export const lightTheme: Theme = {
  mode: "light",
  colors: lightColors,
  spacing,
  radii,
  typography,
  fonts,
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: darkColors,
  spacing,
  radii,
  typography,
  fonts,
};
