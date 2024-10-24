import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { injectIntl, intlShape } from '@edx/frontend-platform/i18n';
import {
  Form, Hyperlink, ModalDialog, Spinner, TransitionReplace,
  StatefulButton, Badge, ActionRow,
} from '@edx/paragon';
import classNames from 'classnames';
import { Formik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { RequestStatus } from '../../data/constants';
import FormSwitchGroup from '../../generic/FormSwitchGroup';
import { useModel } from '../../generic/model-store';
import { getLoadingStatus, getSavingStatus } from '../data/selectors';
import { updateAppStatus } from '../data/thunks';
import { updateSavingStatus } from '../data/slice';
import AppConfigFormDivider from '../discussions/app-config-form/apps/shared/AppConfigFormDivider';
import { PagesAndResourcesContext } from '../PagesAndResourcesProvider';
import messages from './messages';
import { useIsMobile } from '../../utils';

function AppSettingsForm({ formikProps, children }) {
  return children && (
    <TransitionReplace>
      {formikProps.values.enabled
        ? (
          <React.Fragment key="app-enabled">
            {children(formikProps)}
          </React.Fragment>
        ) : (
          <React.Fragment key="app-disabled" />
        )}
    </TransitionReplace>
  );
}

AppSettingsForm.propTypes = {
  formikProps: PropTypes.shape({
    values: PropTypes.shape({ enabled: PropTypes.bool.isRequired }),
  }).isRequired,
  children: PropTypes.func,
};

AppSettingsForm.defaultProps = {
  children: null,
};

function AppSettingsModal({
  intl,
  appId,
  title,
  children,
  initialValues,
  validationSchema,
  onClose,
  onSettingsSave,
  enableAppLabel,
  enableAppHelp,
  learnMoreText,
}) {
  const { courseId } = useContext(PagesAndResourcesContext);
  const loadingStatus = useSelector(getLoadingStatus);
  const updateSettingsRequestStatus = useSelector(getSavingStatus);
  const appInfo = useModel('courseApps', appId);
  const dispatch = useDispatch();
  const submitButtonState = updateSettingsRequestStatus === RequestStatus.IN_PROGRESS ? 'pending' : 'default';
  const isMobile = useIsMobile();
  const modalVariant = isMobile ? 'dark' : 'default';

  useEffect(() => {
    if (updateSettingsRequestStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatus({ status: '' }));
      onClose();
    }
  }, [updateSettingsRequestStatus]);

  const handleFormSubmit = (values) => {
    dispatch(updateAppStatus(courseId, appInfo.id, values.enabled));
    // Call the submit handler for the settings component to save its settings
    if (onSettingsSave) {
      onSettingsSave();
    }
  };

  const learnMoreLink = appInfo.documentationLinks?.learnMoreConfiguration && (
    <Hyperlink
      className="text-primary-500"
      destination={appInfo.documentationLinks.learnMoreConfiguration}
      target="_blank"
      rel="noreferrer noopener"
    >
      {learnMoreText}
    </Hyperlink>
  );

  return (
    <>
      {
        loadingStatus === RequestStatus.SUCCESSFUL && (
          <Formik
            initialValues={{
              enabled: !!appInfo?.enabled,
              ...initialValues,
            }}
            validationSchema={
              Yup.object()
                .shape({
                  enabled: Yup.boolean(),
                  ...validationSchema,
                })
            }
            onSubmit={handleFormSubmit}
          >
            {(formikProps) => (
              <Form
                onSubmit={formikProps.handleSubmit}
              >
                <ModalDialog
                  title={title}
                  isOpen
                  onClose={onClose}
                  size="md"
                  variant={modalVariant}
                  hasCloseButton={isMobile}
                  isFullscreenOnMobile
                >
                  <ModalDialog.Header>
                    <ModalDialog.Title>
                      {title}
                    </ModalDialog.Title>
                  </ModalDialog.Header>
                  <ModalDialog.Body>
                    <FormSwitchGroup
                      id={`enable-${appId}-toggle`}
                      name="enabled"
                      onChange={(event) => formikProps.handleChange(event)}
                      onBlur={formikProps.handleBlur}
                      checked={formikProps.values.enabled}
                      label={(
                        <div className="d-flex align-items-center">
                          {enableAppLabel}
                          {
                          formikProps.values.enabled && (
                            <Badge className="ml-2" variant="success">
                              {intl.formatMessage(messages.enabled)}
                            </Badge>
                          )
                        }
                        </div>
                    )}
                      helpText={(
                        <div>
                          <p>{enableAppHelp}</p>
                          <span className="py-3">{learnMoreLink}</span>
                        </div>
                    )}
                    />
                    <AppSettingsForm formikProps={formikProps}>
                      {children}
                    </AppSettingsForm>
                  </ModalDialog.Body>

                  {formikProps.values.enabled && children
                  && <AppConfigFormDivider marginAdj={{ default: 3, sm: null }} />}

                  <ModalDialog.Footer
                    className={classNames(
                      'p-4',
                    )}
                  >
                    <ActionRow>
                      <ModalDialog.CloseButton variant="tertiary">
                        {intl.formatMessage(messages.cancel)}
                      </ModalDialog.CloseButton>
                      <StatefulButton
                        labels={{
                          default: intl.formatMessage(messages.save),
                          pending: intl.formatMessage(messages.saving),
                          complete: intl.formatMessage(messages.saved),
                        }}
                        state={submitButtonState}
                        onClick={formikProps.handleSubmit}
                      />
                    </ActionRow>
                  </ModalDialog.Footer>
                </ModalDialog>
              </Form>
            )}
          </Formik>
        )
      }
      {loadingStatus === RequestStatus.IN_PROGRESS && (
        <Spinner animation="border" variant="primary" className="align-self-center" />
      )}
    </>
  );
}

AppSettingsModal.propTypes = {
  intl: intlShape.isRequired,
  title: PropTypes.string.isRequired,
  appId: PropTypes.string.isRequired,
  children: PropTypes.func,
  onSettingsSave: PropTypes.func,
  initialValues: PropTypes.objectOf(PropTypes.any),
  validationSchema: PropTypes.objectOf(PropTypes.func),
  onClose: PropTypes.func.isRequired,
  enableAppLabel: PropTypes.string.isRequired,
  enableAppHelp: PropTypes.string.isRequired,
  learnMoreText: PropTypes.string.isRequired,
};

AppSettingsModal.defaultProps = {
  children: null,
  onSettingsSave: null,
  initialValues: {},
  validationSchema: {},
};

export default injectIntl(AppSettingsModal);
