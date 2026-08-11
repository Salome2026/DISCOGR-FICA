// react-pdf/Helvetica has a font-metrics bug where "Yo" (capital Y followed
// by lowercase o) gets misread as a line-break opportunity, splitting
// "YouTube" into "Y ouTube" even with hyphenation disabled and plenty of
// width — verified empirically, not a hyphenation issue. A zero-width
// non-joiner between the two letters is invisible but stops the false break.
export function sanitizePdfText(s: string): string {
  return s.replace(/Yo(u[Tt]ube)/g, "Y‌o$1");
}
