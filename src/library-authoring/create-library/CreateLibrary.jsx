// @ts-check
/* eslint-disable react/prop-types */
import React from 'react';
import { StudioFooter } from '@edx/frontend-component-footer';
import { TypeaheadDropdown } from '@edx/frontend-lib-content-components';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert,
  Container,
  Form,
  StatefulButton,
} from '@openedx/paragon';
import classNames from 'classnames';

import Header from '../../header';
import SubHeader from '../../generic/sub-header/SubHeader';
import { useCreateLibraryForm } from './hooks';
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
    handleSubmit,
    isSubmitting,
    setFieldValue,
    organizationListData,
    apiError,
  } = useCreateLibraryForm(initialValues);

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
        <Form onSubmit={handleSubmit}>
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
                  handleBlur={handleBlur}
                  handleChange={(value) => setFieldValue('org', value)}
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
          <StatefulButton
            type="submit"
            variant="primary"
            className="action btn-primary"
            state={isSubmitting ? 'disabled' : 'enabled'}
            disabledStates={['disabled']}
            labels={{
              enabled: 'Create', // ToDo: Add i18n
              disabled: 'Creating...', // ToDo: Add i18n
            }}
          />
        </Form>
        {apiError && (
          <Alert variant="danger" className="mt-3">
            {apiError}
          </Alert>
        )}
      </Container>
      <StudioFooter />
    </>
  );
};

export default CreateLibrary;
