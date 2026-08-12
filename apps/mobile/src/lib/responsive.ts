import { useWindowDimensions } from "react-native";
import { theme } from "@discografica/shared/theme";

// One hook every screen with a grid (artist grids, playlist grids, KPI
// tiles) should use instead of a hardcoded numColumns — so the app grows
// from 1-2 columns on a phone up to 3-4 on an iPad/desktop instead of
// staying phone-width forever on a bigger screen. This is what "mobile
// first, adapts to tablet/desktop" means for a native app: RN runs iPad
// apps at native width, so ignoring window size the way the old fixed
// numColumns={2} grids did was the actual responsive bug.
export function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= theme.breakpoint.tablet;
  const isDesktop = width >= theme.breakpoint.desktop;

  // Given a target minimum card width, how many columns fit? Same idea as
  // the web's repeat(auto-fill, minmax(...)) grid-template-columns.
  function columnsFor(minItemWidth: number, gap = theme.space.md): number {
    const usable = width - theme.space.xl * 2;
    const cols = Math.floor((usable + gap) / (minItemWidth + gap));
    return Math.max(1, cols);
  }

  return { width, isTablet, isDesktop, columnsFor };
}
