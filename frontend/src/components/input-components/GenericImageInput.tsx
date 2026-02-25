// GenericImageInput.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';

interface GenericImageInputProps {
  name: string;
  title: string;
  value: string; // Assume a URL for preview; could also be a File.
  onChange: (newValue: string) => void;
  error?: string;
  disabled?: boolean;
}

const GenericImageInput: React.FC<GenericImageInputProps> = ({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value || '');

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onChange(previewUrl);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>{title}</Typography>
      {preview && (
        <Box mb={1}>
          <img
            src={preview}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 4 }}
          />
        </Box>
      )}
      <Button variant="contained" component="label" disabled={disabled}
        style={{ marginTop: '8px', marginBottom: '20px' }}
        >
        Select Image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
        />
      </Button>
      {error && (
        <Typography variant="caption" color="error">{error}</Typography>
      )}
    </Box>
  );
};

export default GenericImageInput;
