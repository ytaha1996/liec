import React from "react";
import {
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

interface GenericCheckBoxProps {
  onChange: (value: string[]) => void;
  label: string;
  options: string[]; // An array of option labels
  value: string[];
  defaultValue: string[]; // New prop for default value
}

const GenericCheckBox: React.FC<GenericCheckBoxProps> = ({
  label,
  options,
  onChange,
  value,
  defaultValue,
}) => {
  const initialValue = value || defaultValue; // Use the defaultValue if value is falsy

  const handleCheckChange = (option: string) => {
    const updatedValue = initialValue.includes(option)
      ? initialValue.filter((item) => item !== option) // Remove the option if it's already selected
      : [...initialValue, option]; // Add the option if it's not selected
    onChange(updatedValue);
  };

  return (
    <FormControl>
      <FormLabel id="demo-checkbox-group-label">{label}</FormLabel>
      <FormGroup>
        {options.map((option, index) => (
          <FormControlLabel
            key={index}
            control={
              <Checkbox
                checked={initialValue.includes(option)}
                onChange={() => handleCheckChange(option)}
              />
            }
            label={option}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
};

export default GenericCheckBox;
