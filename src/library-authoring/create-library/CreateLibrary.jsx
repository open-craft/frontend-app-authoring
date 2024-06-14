// @ts-check
/* eslint-disable react/prop-types */
import React from 'react';
import { TypeaheadDropdown } from '@edx/frontend-lib-content-components';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import { Container, Form } from '@openedx/paragon';
import classNames from 'classnames';

import Header from '../../header';
import SubHeader from '../../generic/sub-header/SubHeader';
import { useCreateLibrary } from './hooks';
import messages from './messages';

const CreateLibrary = () => {
  const intl = useIntl();
  const initialValues = {
    title: '',
    org: '',
    slug: '',
  };
  const {
    values,
    errors,
    hasErrorField,
    handleChange,
    handleBlur,
    organizationListData,
  } = useCreateLibrary(initialValues);

  const newLibraryFields = [
    {
      label: intl.formatMessage(messages.titleLabel),
      helpText: intl.formatMessage(messages.titleHelp),
      name: 'title',
      value: values.title,
      placeholder: intl.formatMessage(messages.titlePlaceholder),
    },
    {
      label: intl.formatMessage(messages.orgLabel),
      helpText: intl.formatMessage(messages.orgHelp),
      name: 'org',
      value: values.org,
      options: organizationListData,
      placeholder: intl.formatMessage(messages.orgPlaceholder),
    },
    {
      label: intl.formatMessage(messages.slugLabel),
      helpText: intl.formatMessage(messages.slugHelp),
      name: 'slug',
      value: values.slug,
      placeholder: intl.formatMessage(messages.slugPlaceholder),
    },
  ];

  return (
    <>
      <Header isHiddenMainMenu />
      <Container size="xl" className="p-4 mt-3">
        <SubHeader
          title={<FormattedMessage {...messages.createLibrary} />}
        />
        {newLibraryFields.map((field) => (
          <Form.Group
            className={classNames('form-group-custom', {
              'form-group-custom_isInvalid': hasErrorField(field.name),
            })}
            key={field.name}
          >
            <Form.Label>{field.label}</Form.Label>
            {field.name !== 'org' ? (
              <Form.Control
                value={field.value}
                placeholder={field.placeholder}
                name={field.name}
                onChange={handleChange}
                onBlur={handleBlur}
                isInvalid={hasErrorField(field.name)}
              />
            ) : (
              <TypeaheadDropdown
                type="text"
                name="org"
                readOnly={false}
                value={field.value}
                options={organizationListData}
                controlClassName="has-value"
                handleBlur={handleBlur}
                handleChange={handleChange}
                placeholder={field.placeholder}
                noOptionsMessage="No options found"
              />
            )}
            <Form.Text>{field.helpText}</Form.Text>
            {hasErrorField(field.name) && (
              <Form.Control.Feedback
                className="feedback-error"
                type="invalid"
                hasIcon={false}
              >
                {errors[field.name]}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        ))}
      </Container>
    </>
  );
};

export default CreateLibrary;
