/**
 * OrganizationField
 *
 * Shows a TypeaheadDropdown if the user is allowed to create new organizations,
 * or a Form.Autosuggest drop-down if the user must choose from the list of existing organizations.
 */
import classNames from 'classnames';
import { Form } from '@openedx/paragon';
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
  isLoading = false,
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
          <Form.Autosuggest
            name={name}
            isLoading={isLoading}
            onChange={
              (event) => onChange(event.selectionId)
            }
            placeholder={placeholder}
            className="mr-2"
          >
            {options ? options.map((org) => (
              <Form.AutosuggestOption key={org} id={org}>
                {org}
              </Form.AutosuggestOption>
            )) : []}
          </Form.Autosuggest>
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
