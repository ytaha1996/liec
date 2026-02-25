import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// GenericImageInput.tsx
import { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
const GenericImageInput = ({ name, title, value, onChange, error, disabled, }) => {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(value || '');
    useEffect(() => {
        setPreview(value || '');
    }, [value]);
    const handleFileChange = (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);
            onChange(previewUrl);
        }
    };
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: title }), preview && (_jsx(Box, { mb: 1, children: _jsx("img", { src: preview, alt: title, style: { maxWidth: '100%', maxHeight: '200px', borderRadius: 4 } }) })), _jsxs(Button, { variant: "contained", component: "label", disabled: disabled, style: { marginTop: '8px', marginBottom: '20px' }, children: ["Select Image", _jsx("input", { type: "file", accept: "image/*", hidden: true, onChange: handleFileChange, ref: fileInputRef })] }), error && (_jsx(Typography, { variant: "caption", color: "error", children: error }))] }));
};
export default GenericImageInput;
