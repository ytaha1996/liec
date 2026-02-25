import dayjs from "dayjs";
import { isEmpty, isValidNumber } from "./validation-utils";


export function formatCurrencyNumber(value: any, decimals = 2): string {
    if (!isValidNumber(value)) {
        return "--";
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(parseFloat(value.toString()));
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
