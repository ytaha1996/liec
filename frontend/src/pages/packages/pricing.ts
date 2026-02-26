export const computeDisplayTotal = (subtotal: number, discountPercent: number, fees: number) => {
  const discountFactor = Math.max(0, 1 - discountPercent / 100);
  return Math.round(((subtotal * discountFactor) + fees) * 100) / 100;
};
