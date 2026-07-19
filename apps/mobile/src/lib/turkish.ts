// Turkish-correct uppercasing. The default/CSS uppercase maps "i" -> "I"
// (dotless), but Turkish requires "i" -> "İ" (dotted). Hermes lacks full
// locale-aware casing, so handle the one letter that differs, then let
// toUpperCase do the rest (ç/ş/ğ/ö/ü and dotless ı -> I are already
// correct under the default mapping).
export function toTrUpper(value: string): string {
  return value.replace(/i/g, "İ").toUpperCase();
}
