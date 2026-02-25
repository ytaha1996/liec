import dayjs from 'dayjs';
import { formatDate } from '../../helpers/formatting-utils';
import { isEmpty } from '../../helpers/validation-utils';
export var DynamicField;
(function (DynamicField) {
    DynamicField["TEXT"] = "TEXT";
    DynamicField["NUMBER"] = "NUMBER";
    DynamicField["CURRENCY"] = "CURRENCY";
    DynamicField["PHONENUMBER"] = "PHONENUMBER";
    DynamicField["SELECT"] = "SELECT";
    DynamicField["MULTISELECT"] = "MULTISELECT";
    DynamicField["RADIOGROUP"] = "RADIOGROUP";
    DynamicField["CHECKBOX"] = "CHECKBOX";
    DynamicField["CHECKBOXLIST"] = "CHECKBOXLIST";
    DynamicField["TEXTAREA"] = "TEXTAREA";
    DynamicField["FILE"] = "FILE";
    DynamicField["DATE"] = "DATE";
    DynamicField["EMAIL"] = "EMAIL";
    DynamicField["IMAGE"] = "IMAGE";
    DynamicField["IMAGELIST"] = "IMAGELIST";
    DynamicField["TAGS"] = "TAGS";
})(DynamicField || (DynamicField = {}));
export const prepareValuesForSubmission = (data, fields) => {
    var result = { ...data };
    Object.keys(fields).forEach(k => {
        if (fields[k].type === DynamicField.DATE) {
            if (!isEmpty(data[k]) && dayjs(data[k]).isValid()) {
                result[k] = formatDate(data[k], "YYYY-MM-DD");
            }
        }
    });
    return result;
};
