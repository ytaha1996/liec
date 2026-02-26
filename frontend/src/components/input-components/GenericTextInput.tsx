import React from 'react';
import { tss } from 'tss-react';
import GenericInputWrapper from './GenericInputWrapper';
import { TextField } from '@mui/material';

interface IGenericInputProps {
  title: string;
  type: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  name: string;
  onBlur?: (name: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'standard' | 'filled' | 'outlined';
  placeholder?: string;
  className?: string;
  hideError?: boolean;
  containerClassName?: string;
}

const useStyles = tss.create({
  label: {
    display: 'block'
  },
  input: {
    width: '100%'
  },
  errorInput: {},
  error: {}
});

const GenericInput: React.FC<IGenericInputProps> = ({
  title,
  variant = 'outlined',
  type = 'text',
  value,
  disabled,
  error,
  size = 'medium',
  onChange,
  name,
  placeholder,
  onBlur = () => {},
  className,
  hideError,
  containerClassName
}) => {
  const { classes, cx } = useStyles();
  return (
    <GenericInputWrapper
      customClasses={{ main: containerClassName }}
      hideError={hideError}
      title={''}
      error={error}
      name={name}
    >
      <TextField
        type={type}
        variant={variant}
        value={value}
        label={title}
        placeholder={placeholder}
        error={!!error}
        size={size}
        disabled={disabled}
        className={cx(
          classes.input,
          className,
          !!error ? classes.errorInput : undefined
        )}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur(name)}
      />
    </GenericInputWrapper>
  );
};

export default GenericInput;
