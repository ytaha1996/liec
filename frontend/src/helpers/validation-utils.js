export const REGEX = {
    email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
};
export function isEmpty(value) {
    return value === undefined || value === null || value === "";
}
export function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}
export function isValidNumber(value) {
    if (isEmpty(value)) {
        return false;
    }
    if (typeof value === 'number' && !isNaN(value)) {
        return true;
    }
    if (typeof value === 'string') {
        const numberValue = parseFloat(value);
        return !isNaN(numberValue);
    }
    return false;
}
export function isValidString(value) {
    return typeof value === 'string';
}
export function maxCharacters(value, maxLength) {
    return isValidString(value) && value.length < maxLength;
}
export function minCharacters(value, minCharacters) {
    return isValidString(value) && value.length > minCharacters;
}
export function isDateBetween(dateX, dateY, dateZ) {
    const x = dateX.getTime();
    const y = dateY.getTime();
    const z = dateZ.getTime();
    return x >= y && x <= z;
}
export function greaterThanInclusive(dateA, dateB) {
    return dateA.getTime() >= dateB.getTime();
}
export function lessThanInclusive(dateA, dateB) {
    return dateA.getTime() <= dateB.getTime();
}
