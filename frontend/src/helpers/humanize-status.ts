// Humanise CamelCase status tokens embedded in user-facing strings.
// "ReadyToShip" → "Ready to Ship", "ArrivedAtDestination" → "Arrived at Destination".
// Only multi-word CamelCase identifiers are matched, so single-capital words
// in normal prose ("Cannot transition Package #5") aren't disturbed.
const CAMEL_CASE_TOKEN = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;

export const humanizeStatus = (token: string): string =>
  token.replace(/([a-z])([A-Z])/g, '$1 $2');

export const humanizeStatusInText = (text: string | undefined | null): string => {
  if (!text) return '';
  return text.replace(CAMEL_CASE_TOKEN, (m) => {
    const parts = m.match(/[A-Z][a-z]+/g) ?? [m];
    // First part stays capitalised, the rest go lower-case
    // (so "ReadyToShip" → "Ready to Ship", not "Ready To Ship").
    return parts
      .map((p, i) => (i === 0 ? p : p.toLowerCase()))
      .join(' ');
  });
};
