// Design tokens — the only place raw values live. Components must consume
// these through useTheme(); no raw hex/sizes in component files.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400" },
  caption: { fontSize: 13, fontWeight: "400" },
} as const;

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
}

const lightColors: ColorTokens = {
  background: "#FFFFFF",
  surface: "#F4F4F5",
  textPrimary: "#18181B",
  textSecondary: "#6B7280",
  accent: "#E4572E",
  onAccent: "#FFFFFF",
  border: "#E4E4E7",
  skeleton: "#E4E4E7",
  error: "#DC2626",
};

const darkColors: ColorTokens = {
  background: "#0F0F10",
  surface: "#1C1C1F",
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  accent: "#FF6B4A",
  onAccent: "#1A0A05",
  border: "#2A2A2E",
  skeleton: "#2A2A2E",
  error: "#F87171",
};

export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

export const lightTheme: Theme = {
  mode: "light",
  colors: lightColors,
  spacing,
  radii,
  typography,
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: darkColors,
  spacing,
  radii,
  typography,
};
