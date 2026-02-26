// GenericImageListInput.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface GenericImageListInputProps {
  name: string;
  title: string;
  value: string[]; // Array of image URLs.
  onChange: (newValue: string[]) => void;
  error?: string;
  disabled?: boolean;
  maxImages?: number;
}

const GenericImageListInput: React.FC<GenericImageListInputProps> = ({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  maxImages,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>(value || []);

  useEffect(() => {
    setPreviews(value || []);
  }, [value]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      let newImages: string[] = [];
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

  const handleRemoveImage = (index: number) => {
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
    onChange(updatedPreviews);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>{title}</Typography>
      <Grid container spacing={2}>
        {previews.map((img, index) => (
          <Grid key={index}>
            <Box position="relative" display="inline-block">
              <img
                src={img}
                alt={`${title} ${index + 1}`}
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: 4,
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveImage(index)}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Button
        variant="contained"
        component="label"
        disabled={disabled || (maxImages != null && previews.length >= maxImages)}
        style={{ marginTop: '8px', marginBottom: '20px' }}
      >
        Add Images
        <input
          type="file"
          accept="image/*"
          multiple
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

export default GenericImageListInput;
