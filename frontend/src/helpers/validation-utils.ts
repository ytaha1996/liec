import dayjs from "dayjs";


export const REGEX = {
    email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
}

export function isEmpty(value: any): boolean {
    return value === undefined || value === null || value === "";
}

export function isValidEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

export function isValidNumber(value: any): boolean {

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

export function isValidString(value: any): boolean {
    return typeof value === 'string';
}

export function maxCharacters(value: string, maxLength: number): boolean {
    return isValidString(value) && value.length < maxLength;
}

export function minCharacters(value: string, minCharacters: number): boolean {
    return isValidString(value) && value.length > minCharacters;
}

export function isDateBetween(dateX: Date, dateY: Date, dateZ: Date): boolean {
    const x = dateX.getTime();
    const y = dateY.getTime();
    const z = dateZ.getTime();

    return x >= y && x <= z;
}

export function greaterThanInclusive(dateA: Date, dateB: Date): boolean {
    return dateA.getTime() >= dateB.getTime();
}

export function lessThanInclusive(dateA: Date, dateB: Date): boolean {
    return dateA.getTime() <= dateB.getTime();
}
