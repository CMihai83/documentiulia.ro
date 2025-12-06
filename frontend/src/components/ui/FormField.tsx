import React, { type ReactNode, useId } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: ReactNode;
  className?: string;
}

interface InputProps {
  id?: string;
  className?: string;
  'aria-invalid'?: string;
  'aria-describedby'?: string;
}

/**
 * FormField - A wrapper component that provides proper label association and error handling
 * Ensures accessibility compliance with proper htmlFor/id attributes
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  helper,
  children,
  className = '',
}) => {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;

  return (
    <div className={`form-group ${className}`}>
      <label
        htmlFor={fieldId}
        className={`form-label ${required ? 'form-label-required' : ''}`}
      >
        {label}
      </label>

      {/* Clone children and add id if it's an input element */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement<InputProps>(child)) {
          const existingClassName = child.props.className || '';
          const newProps: InputProps = {
            id: fieldId,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': error
              ? `${fieldId}-error`
              : helper
              ? `${fieldId}-helper`
              : undefined,
            className: `${existingClassName} ${error ? 'input-error' : ''}`.trim(),
          };
          return React.cloneElement(child, newProps);
        }
        return child;
      })}

      {error && (
        <p id={`${fieldId}-error`} className="form-error" role="alert">
          {error}
        </p>
      )}

      {helper && !error && (
        <p id={`${fieldId}-helper`} className="form-helper">
          {helper}
        </p>
      )}
    </div>
  );
};

export default FormField;
