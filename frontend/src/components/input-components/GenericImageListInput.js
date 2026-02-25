import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// GenericImageListInput.tsx
import { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
const GenericImageListInput = ({ name, title, value, onChange, error, disabled, maxImages, }) => {
    const fileInputRef = useRef(null);
    const [previews, setPreviews] = useState(value || []);
    useEffect(() => {
        setPreviews(value || []);
    }, [value]);
    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files) {
            let newImages = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                newImages.push(URL.createObjectURL(file));
            }
            const updatedPreviews = [...previews, ...newImages];
            if (maxImages && updatedPreviews.length > maxImages) {
                updatedPreviews.splice(maxImages);
            }
            setPreviews(updatedPreviews);
            onChange(updatedPreviews);
        }
    };
    const handleRemoveImage = (index) => {
        const updatedPreviews = previews.filter((_, i) => i !== index);
        setPreviews(updatedPreviews);
        onChange(updatedPreviews);
    };
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: title }), _jsx(Grid, { container: true, spacing: 2, children: previews.map((img, index) => (_jsx(Grid, { children: _jsxs(Box, { position: "relative", display: "inline-block", children: [_jsx("img", { src: img, alt: `${title} ${index + 1}`, style: {
                                    width: '100px',
                                    height: '100px',
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                } }), _jsx(IconButton, { size: "small", onClick: () => handleRemoveImage(index), style: {
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                }, children: _jsx(DeleteIcon, { fontSize: "small" }) })] }) }, index))) }), _jsxs(Button, { variant: "contained", component: "label", disabled: disabled || (maxImages != null && previews.length >= maxImages), style: { marginTop: '8px', marginBottom: '20px' }, children: ["Add Images", _jsx("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onChange: handleFileChange, ref: fileInputRef })] }), error && (_jsx(Typography, { variant: "caption", color: "error", children: error }))] }));
};
export default GenericImageListInput;
