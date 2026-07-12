export const REGEX = {
  email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
};

export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function isValidEmail(email: string): boolean {
  return REGEX.email.test(email);
}

export function isValidNumber(value: unknown): boolean {
  if (isEmpty(value)) return false;
  if (typeof value === 'number' && !Number.isNaN(value)) return true;
  if (typeof value === 'string') return !Number.isNaN(parseFloat(value));
  return false;
}

export function isValidString(value: unknown): value is string {
  return typeof value === 'string';
}

export function maxCharacters(value: string, maxLength: number): boolean {
  return isValidString(value) && value.length < maxLength;
}

export function minCharacters(value: string, min: number): boolean {
  return isValidString(value) && value.length > min;
}

export function isDateBetween(dateX: Date, dateY: Date, dateZ: Date): boolean {
  const x = dateX.getTime();
  return x >= dateY.getTime() && x <= dateZ.getTime();
}

export function greaterThanInclusive(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

export function lessThanInclusive(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}
