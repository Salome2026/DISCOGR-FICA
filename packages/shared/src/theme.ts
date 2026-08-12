// Single source of truth for design tokens, mirrored exactly from
// app/globals.css's :root custom properties — every color/radius/duration
// value here must equal the web's. When the web's palette changes, update
// both files together (there's no automated sync between CSS custom
// properties and this file, but keeping both in one repo makes the diff
// easy to catch in review). Mobile StyleSheets should import from here
// instead of hardcoding hex values, so the app never drifts from the web's
// actual design system into an approximation of it.

export const theme = {
  bg0: "#08080a",
  bg0b: "#0d0d10",
  bg1: "#17171a",
  bg2: "#1f1f23",
  bg3: "#28282d",
  line: "#38383e",
  lineSoft: "#232327",

  text1: "#f5f5f7",
  text2: "#a9a9b0",
  text3: "#6f6f77",

  // Primary accent — silver/platinum. accentGradient is approximated as a
  // flat color on native (RN has no linear-gradient without an extra
  // library); accentInk is the dark text color used on top of it.
  accent: "#dcdde2",
  accentInk: "#131316",

  // Color accent — the VPO mark's teal, used sparingly (CTAs, focus, one
  // chart segment) same as web.
  accentColor: "#3fc6d1",
  accentColorInk: "#062326",
  accentColorGlow: "rgba(63, 198, 209, 0.35)",

  // Semantic status colors.
  good: "#8fb98a",
  goodBg: "rgba(143, 185, 138, 0.13)",
  goodInk: "#c3e0be",
  warn: "#c9a86a",
  warnBg: "rgba(201, 168, 106, 0.13)",
  warnInk: "#e8d3a4",
  crit: "#c98a86",
  critBg: "rgba(201, 138, 134, 0.15)",
  critInk: "#edbab6",

  // Glass surfaces. RN has no CSS gradient/backdrop-filter — glassBg is a
  // flat approximation of the web's diagonal-sheen gradient for plain
  // View borders, and screens that want the real blur-behind-content look
  // should layer expo-blur's <BlurView intensity={glassBlur} tint="dark">
  // instead of relying on background color alone.
  glassBg: "rgba(255, 255, 255, 0.035)",
  glassBgStrong: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.3)",
  glassBlur: 36,
  glassBlurStrong: 52,

  accentGlassBg: "rgba(220, 221, 226, 0.12)",
  accentGlassBorder: "rgba(220, 221, 226, 0.65)",

  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 20,
  radiusXl: 28,
  radiusPill: 999,

  durFast: 150,
  durBase: 250,
  durSlow: 450,

  // -apple-system is the iOS system font (San Francisco) — same visual
  // family as the web's --font-display on Apple platforms, no custom font
  // file to bundle. Android falls back to Roboto (its own system font);
  // RN doesn't support the web's full font-family fallback chain.
  fontFamily: undefined as string | undefined,

  // 8pt-grid spacing scale — every margin/padding/gap in the app should
  // pull from here instead of a one-off number, so rhythm stays consistent
  // across every module instead of each screen inventing its own numbers.
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
    "4xl": 40,
    "5xl": 48,
  },

  // Typography scale — one place that defines every text role in the app.
  // Screens should reach for type.h1/type.label/etc. instead of picking
  // their own fontSize/fontWeight per screen, which is what produced the
  // "every module feels like a different app" inconsistency.
  type: {
    display: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
    h1: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
    h2: { fontSize: 17, fontWeight: "700" as const },
    h3: { fontSize: 15, fontWeight: "600" as const },
    body: { fontSize: 14, fontWeight: "400" as const },
    bodyStrong: { fontSize: 14, fontWeight: "600" as const },
    small: { fontSize: 12.5, fontWeight: "400" as const },
    smallStrong: { fontSize: 12.5, fontWeight: "600" as const },
    label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4, textTransform: "uppercase" as const },
    caption: { fontSize: 10.5, fontWeight: "500" as const },
  },

  // Responsive breakpoints, in dp — same three-tier split the web's own
  // @media queries use in spirit (phone / tablet / wide), so a grid of
  // cards can grow from 1-2 columns on a phone to 3-4 on an iPad instead
  // of staying phone-width forever on a bigger screen.
  breakpoint: {
    tablet: 700,
    desktop: 1024,
  },
} as const;

export type Theme = typeof theme;
