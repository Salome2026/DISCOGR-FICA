import React, { useRef } from "react";
import { View, Text, Image, Animated, StyleSheet, useWindowDimensions } from "react-native";
import { theme } from "@discografica/shared/theme";

// Mirrors app/components/VPOScrollHero.tsx exactly: an Apple-product-page
// style intro where the mark starts large and centered, pins in place while
// the user scrolls, then shrinks/drifts up/fades out to hand off to the
// content that follows. Web uses Framer Motion's useScroll (0->1 over the
// pin's scrollable distance) driving scale/y/opacity — here the same
// progress value comes from the ScrollView's scroll offset via
// Animated.event, interpolated with the exact same stops the web uses.
// PIN_RATIO mirrors the web's OWN mobile breakpoint (globals.css:
// `.vpo-hero{height:118dvh}` under 640px, vs 140dvh on desktop) — the extra
// 0.18 of screen height is how far you scroll to fully unpin, short enough
// that a single natural swipe clears it, same as on the web.
const PIN_RATIO = 0.18;

// Real logo mark (public/vpo-logo.png, 2539x1298, transparent background) —
// NOT the app icon, which is a solid/opaque square by App Store requirement
// and renders as a visible box when reused as inline art.
const LOGO_ASPECT = 1298 / 2539;

export function ScrollHeroSpacer({ height }: { height: number }) {
  return <View style={{ height }} />;
}

export function ScrollHero({ scrollY }: { scrollY: Animated.Value }) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const pinDistance = screenHeight * PIN_RATIO;
  // Web caps at min(420px, 62vw); mobile app goes a bit larger per design
  // direction ("similar a la web o incluso un poco más grande en celulares").
  const logoWidth = Math.min(480, screenWidth * 0.72);
  const logoHeight = logoWidth * LOGO_ASPECT;

  // Same stops as the web (fractions of the pin's scroll progress),
  // mapped onto the actual pixel scroll distance for this screen size.
  const scale = scrollY.interpolate({ inputRange: [0, pinDistance * 0.9], outputRange: [1, 0.55], extrapolate: "clamp" });
  const translateY = scrollY.interpolate({ inputRange: [0, pinDistance * 0.9], outputRange: [0, -24], extrapolate: "clamp" });
  const markOpacity = scrollY.interpolate({ inputRange: [pinDistance * 0.56, pinDistance * 0.9], outputRange: [1, 0], extrapolate: "clamp" });
  const textOpacity = scrollY.interpolate({ inputRange: [0, pinDistance * 0.36], outputRange: [1, 0], extrapolate: "clamp" });
  const textTranslateY = scrollY.interpolate({ inputRange: [0, pinDistance * 0.44], outputRange: [0, -14], extrapolate: "clamp" });
  const hintOpacity = scrollY.interpolate({ inputRange: [0, pinDistance * 0.16], outputRange: [1, 0], extrapolate: "clamp" });
  // Once fully unpinned, let touches pass through to the content now
  // underneath instead of an invisible-but-still-there overlay eating taps.
  const overlayOpacity = scrollY.interpolate({ inputRange: [0, pinDistance * 0.9, pinDistance], outputRange: [1, 1, 0], extrapolate: "clamp" });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.hero, { height: screenHeight, opacity: overlayOpacity }]}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY }], opacity: markOpacity }}>
        <Image
          source={require("@/assets/images/vpo-logo.png")}
          style={{ width: logoWidth, height: logoHeight }}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
        <Text style={styles.tagline}>Centro de control · acceso interno</Text>
      </Animated.View>
      <Animated.View style={[styles.hint, { opacity: hintOpacity }]}>
        <Text style={styles.hintText}>Deslizá para ingresar ↓</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function usePinDistance(): number {
  const { height } = useWindowDimensions();
  return height * PIN_RATIO;
}

const styles = StyleSheet.create({
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.bg0,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.md,
    zIndex: 10,
  },
  tagline: { color: theme.text3, fontSize: 13, letterSpacing: 0.2, textAlign: "center" },
  hint: { position: "absolute", bottom: 48 },
  hintText: { color: theme.text3, fontSize: 12, letterSpacing: 0.3 },
});
