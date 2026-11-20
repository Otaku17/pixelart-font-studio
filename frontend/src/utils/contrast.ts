/** White on dark paper, black on light paper, at the given opacity. */
export function contrastOn(paper: string, alpha: number): string {
  const n = parseInt(paper.slice(1), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 128 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}
