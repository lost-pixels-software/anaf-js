/**
 * Currency/monetary utilities
 */

/**
 * Round a monetary amount to 2 decimal places
 * @param amount - Amount to round
 * @returns Rounded amount
 */
export function roundMoney(amount: number): number {
  return parseFloat(amount.toFixed(2));
}
