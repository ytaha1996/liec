import dayjs from "dayjs";
import { isEmpty, isValidNumber } from "./validation-utils";
export function formatCurrencyNumber(value, decimals = 2) {
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
export function formatDate(date, format = "DD/MM/YYYY") {
    if (dayjs(date).isValid()) {
        return dayjs(date).format(format);
    }
    return "--"; // or any other value to indicate invalid date input
}
export function formatDateTime(datetime, format = "DD-MM-YYYY HH:mm:ss") {
    const parsedDateTime = dayjs(datetime);
    if (parsedDateTime.isValid()) {
        return parsedDateTime.format(format);
    }
    return "--"; // or any other value to indicate an invalid datetime input
}
export function formatIntPhoneNumber(value) {
    if (!isEmpty(value)) {
        return value;
    }
    return "--";
}
