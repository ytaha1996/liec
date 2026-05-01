import dayjs from "dayjs";
import { isEmpty, isValidNumber } from "./validation-utils";


export function formatCurrencyNumber(value: any, currency: string = 'USD', decimals = 2): string {
    if (!isValidNumber(value)) {
        return "--";
    }

    // Falls back gracefully if the runtime doesn't recognize the currency code.
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(parseFloat(value.toString()));
    } catch {
        return `${currency} ${parseFloat(value.toString()).toFixed(decimals)}`;
    }
}

export function formatDate(date: any, format: string = "DD/MM/YYYY"): string {
    if (dayjs(date).isValid()) {
        return dayjs(date).format(format);
    }
    return "--";  // or any other value to indicate invalid date input
}

export function formatDateTime(datetime: any, format: string = "DD-MM-YYYY HH:mm:ss"): string {
    const parsedDateTime = dayjs(datetime);

    if (parsedDateTime.isValid()) {
        return parsedDateTime.format(format);
    }

    return "--";  // or any other value to indicate an invalid datetime input
}


export function formatIntPhoneNumber(value: string) {
    if (!isEmpty(value)) {
        return value;
    }
    return "--";
}
