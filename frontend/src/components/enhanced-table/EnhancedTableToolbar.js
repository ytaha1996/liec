import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Toolbar } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import Dropdown from '../CustomDropdown';
import GenericInput from '../input-components/GenericTextInput';
import { TableFilterTypes } from './index-filter';
import GenericSelectInput from '../input-components/GenericSelectInput';
import GenericDateRangePicker from '../input-components/GenericDateRangePicker';
const useStyles = makeStyles()((_theme) => ({
    toolbar: {
        display: "flex",
        justifyContent: "space-between",
        alignContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "65px",
        flexWrap: "wrap",
    },
    leftSection: {
        display: "flex"
    },
    title: {
        display: "block",
        marginRight: "15px",
        color: '#fff'
    },
    searchField: {
        border: 'none',
        outline: 'none',
        fontSize: "16px",
        padding: "0 0 2px",
        margin: "0 0 0 0",
        color: "white"
    },
    searchFieldWrapper: {
        margin: "0 15px 0 0"
    },
    dropdownButton: {
        backgroundColor: "#6e759f",
        '&:hover': {
            backgroundColor: "#565c81",
        },
    }
}));
const EnhancedTableToolbar = ({ searchKey, selected, actions = [], onSearchUpdate, filters = [], onFilterUpdate }) => {
    const { classes } = useStyles();
    const dropdownOption = actions.map((action) => {
        return {
            key: action.key,
            title: action.title,
            onClick: () => { action.onClick(selected); },
            disabled: action.disabled(selected)
        };
    });
    const renderFilters = () => {
        return filters.map((filter) => {
            if (filter.type === TableFilterTypes.SELECT) {
                return (_jsx(GenericSelectInput, { title: filter.title, value: filter.value || [], onChange: (value) => onFilterUpdate(filter.name, value), items: filter.options || {}, multiple: true, name: filter.name, type: '' }, filter.name));
            }
            if (filter.type === TableFilterTypes.DATERANGE) {
                return (_jsx(GenericDateRangePicker, { title: filter.title, value: filter.value || [], onChange: (value) => onFilterUpdate(filter.name, value), name: filter.name }, filter.name));
            }
            return null;
        });
    };
    return (_jsxs(Toolbar, { className: classes.toolbar, style: {
            padding: '10px 16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
        }, children: [_jsx("div", { className: classes.leftSection, children: _jsx(GenericInput, { containerClassName: classes.searchFieldWrapper, hideError: true, title: "", name: "", size: "small", value: searchKey, type: 'text', placeholder: 'Search...', className: classes.searchField, onChange: (v) => { onSearchUpdate(v); } }) }), actions && actions.length > 0 ?
                _jsx(Dropdown, { title: "Actions", options: dropdownOption, className: classes.dropdownButton }) : _jsx("span", {}), filters && filters.length > 0 ? renderFilters() : _jsx("span", {})] }));
};
export default EnhancedTableToolbar;
