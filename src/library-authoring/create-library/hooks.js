// @ts-check
import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';

import { useOrganizationListData } from '../../generic/data/apiHooks';
import { useCreateLibraryV2 } from './data/apiHooks';
import messages from './messages';

// eslint-disable-next-line import/prefer-default-export
export const useCreateLibraryForm = (initialValues) => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [apiError, setApiError] = useState(null);

  const {
    mutateAsync,
  } = useCreateLibraryV2();

  const specialCharsRule = /^[a-zA-Z0-9_\-.'*~\s]+$/;
  const noSpaceRule = /^\S*$/;
  const validSlugIdRegex = /^[a-zA-Z\d]+(?:[\w -]*[a-zA-Z\d]+)*$/;

  const validationSchema = Yup.object().shape({
    title: Yup.string()
      .required(intl.formatMessage(messages.requiredFieldError)),
    org: Yup.string()
      .required(intl.formatMessage(messages.requiredFieldError))
      .matches(
        specialCharsRule,
        intl.formatMessage(messages.disallowedCharsError),
      )
      .matches(noSpaceRule, intl.formatMessage(messages.noSpaceError)),
    slug: Yup.string()
      .required(intl.formatMessage(messages.requiredFieldError))
      .matches(
        validSlugIdRegex,
        intl.formatMessage(messages.invalidSlugError),
      ),
  });

  const {
    data: organizationListData,
  } = useOrganizationListData();

  const onSubmit = async (values) => {
    setApiError(null);
    try {
      const data = await mutateAsync(values);
      navigate(`/library/${data.id}`);
    } catch (/** @type {any} */ error) {
      setApiError(error.message);
    }
  };

  const {
    values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue,
  } = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
  });

  const hasErrorField = (fieldName) => !!errors[fieldName] && !!touched[fieldName];

  return {
    errors,
    handleBlur,
    handleChange,
    handleSubmit,
    hasErrorField,
    isSubmitting,
    organizationListData,
    setFieldValue,
    values,
    apiError,
  };
};
