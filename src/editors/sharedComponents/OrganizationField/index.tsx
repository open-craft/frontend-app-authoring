/**
 * OrganizationField
 *
 * Shows a TypeaheadDropdown if the user is allowed to create new organizations,
 * or a Form.Autosuggest drop-down if the user must choose from the list of existing organizations.
 */
import classNames from 'classnames';
import { Dropdown, Form } from '@openedx/paragon';
import TypeaheadDropdown from '../TypeaheadDropdown';

const OrganizationField = ({
  name,
  label,
  value,
  placeholder,
  options,
  noOptionsMessage,
  onChange,
  onBlur,
  onFocus,
  hasError,
  errorMessage,
  helpMessage = '',
  className = '',
  allowToCreateNewOrg = false,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  noOptionsMessage: string;
  onChange: (value: string) => void;
  onBlur: (e: FocusEvent) => void;
  onFocus: (e: FocusEvent) => void;
  className?: string;
  hasError?: boolean;
  errorMessage?: string;
  helpMessage?: string;
  allowToCreateNewOrg?: boolean;
  isLoading?: boolean;
}) => (
  <Form.Group className={className} key={label}>
    <Form.Label>{label}</Form.Label>
    {allowToCreateNewOrg
      ? (
        <TypeaheadDropdown
          readOnly={false}
          name={name}
          value={value}
          controlClassName={classNames({ 'is-invalid': hasError })}
          options={options}
          placeholder={placeholder}
          handleChange={onChange}
          handleBlur={onBlur}
          handleFocus={onFocus}
          noOptionsMessage={noOptionsMessage}
          helpText={helpMessage}
          errorMessage={errorMessage}
          floatingLabel=""
        />
      ) : (
        <>
          <Dropdown className="mr-2">
            <Dropdown.Toggle id={`${name}-dropdown`} variant="outline-primary">
              {value || noOptionsMessage}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {options?.map((option) => (
                <Dropdown.Item
                  key={option}
                  onClick={() => onChange(option)}
                >
                  {option}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <Form.Text>{helpMessage}</Form.Text>
          {hasError && (
            <Form.Control.Feedback
              className="feedback-error"
              type="invalid"
              hasIcon={false}
            >
              {errorMessage}
            </Form.Control.Feedback>
          )}
        </>
      )}
  </Form.Group>
);

export default OrganizationField;
