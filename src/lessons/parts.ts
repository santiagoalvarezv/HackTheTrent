/** Resistor colour code: digit colours 0–9. */
export const BAND_COLORS = ["#1b1b1b", "#7a4a2b", "#c0251f", "#e3741c", "#e8c51a", "#2f8f3a", "#2456b8", "#7d3fb0", "#8a8d93", "#f2f2f2"];
export const BAND_NAMES = ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "grey", "white"];
export const GOLD = "#c9a227";

/** 4-band code (two digits, multiplier, ±5% gold) for an E-series value. */
export function resistorBandDigits(ohms: number): [number, number, number] {
  const exp = Math.floor(Math.log10(ohms)) - 1;
  const digits = Math.round(ohms / 10 ** exp);
  return [Math.floor(digits / 10), digits % 10, exp];
}

export function resistorBands(ohms: number): string[] {
  const [a, b, m] = resistorBandDigits(ohms);
  return [BAND_COLORS[a]!, BAND_COLORS[b]!, BAND_COLORS[m]!, GOLD];
}
