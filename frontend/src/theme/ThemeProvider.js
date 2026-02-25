import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material';
import { themeCreator } from './base';
export const ThemeContext = React.createContext((themeName) => { });
const ThemeProviderWrapper = (props) => {
    const curThemeName = localStorage.getItem('appTheme') || 'PureLightTheme';
    const [themeName, _setThemeName] = useState(curThemeName);
    const theme = themeCreator(themeName);
    const setThemeName = (themeName) => {
        localStorage.setItem('appTheme', themeName);
        _setThemeName(themeName);
    };
    return (_jsx(ThemeContext.Provider, { value: setThemeName, children: _jsx(ThemeProvider, { theme: theme, children: props.children }) }));
};
export default ThemeProviderWrapper;
