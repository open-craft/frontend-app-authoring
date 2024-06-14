// @ts-check
import { useIntl } from '@edx/frontend-platform/i18n';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { useOrganizationListData } from '../../generic/data/apiHooks';
import messages from './messages';

// eslint-disable-next-line import/prefer-default-export
export const useCreateLibrary = (initialValues) => {
  const intl = useIntl();

  const specialCharsRule = /^[a-zA-Z0-9_\-.'*~\s]+$/;
  const noSpaceRule = /^\S*$/;
  const validSlugIdRegex = /^[a-zA-Z\d]+(?:[\w -]*[a-zA-Z\d]+)*$/;

  const validationSchema = Yup.object().shape({
    displayName: Yup.string().required(
      intl.formatMessage(messages.requiredFieldError),
    ),
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
    title: Yup.string()
      .required(intl.formatMessage(messages.requiredFieldError)),
  });

  const {
    data: organizationListData,
    isSuccess: isOrganizationListLoaded,
  } = useOrganizationListData();

  const onSubmit = async (values) => {
    console.log('values', values);
  };

  const {
    values, errors, touched, handleChange, handleBlur, setFieldValue,
  } = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnBlur: false,
    validationSchema,
    onSubmit,
  });

  const hasErrorField = (fieldName) => !!errors[fieldName] && !!touched[fieldName];
  const isFormInvalid = !!Object.keys(errors).length;

  return {
    organizationListData,
    hasErrorField,
    isFormInvalid,
    handleChange,
    handleBlur,
    values,
    errors,
  };
};
