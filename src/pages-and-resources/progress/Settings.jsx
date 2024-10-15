import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import PropTypes from 'prop-types';
import React from 'react';
import * as Yup from 'yup';
import messages from './messages';
import FormSwitchGroup from '../../generic/FormSwitchGroup';
import { useAppSetting } from '../../utils';
import AppSettingsModal from '../app-settings-modal/AppSettingsModal';

const ProgressSettings = ({ onClose }) => {
  const intl = useIntl();
  const [disableProgressGraph, saveSetting] = useAppSetting('disableProgressGraph');
  const [otherCourseSettings, saveOtherCourseSettings] = useAppSetting('otherCourseSettings');
  const showProgressGraphSetting = getConfig().ENABLE_PROGRESS_GRAPH_SETTINGS.toString().toLowerCase() === 'true';

  const handleSettingsSave = async (values) => {
    if (showProgressGraphSetting) {
      await saveSetting(!values.enableProgressGraph);
    }
    const updatedOtherCourseSettings = {
      ...otherCourseSettings,
      progressPage: {
        showGrades: values.showGrades,
        showGradeBreakdown: values.showGradeBreakdown,
        showRelatedLinks: values.showRelatedLinks,
        showCertificateStatus: values.showCertificateStatus,
      },
    };
    await saveOtherCourseSettings(updatedOtherCourseSettings);
  };

  return (
    <AppSettingsModal
      appId="progress"
      title={intl.formatMessage(messages.heading)}
      enableAppHelp={intl.formatMessage(messages.enableProgressHelp)}
      enableAppLabel={intl.formatMessage(messages.enableProgressLabel)}
      learnMoreText={intl.formatMessage(messages.enableProgressLink)}
      onClose={onClose}
      initialValues={{
        enableProgressGraph: !disableProgressGraph,
        showGrades: otherCourseSettings?.progressPage?.showGrades ?? true,
        showGradeBreakdown: otherCourseSettings?.progressPage?.showGradeBreakdown ?? true,
        showRelatedLinks: otherCourseSettings?.progressPage?.showRelatedLinks ?? true,
        showCertificateStatus: otherCourseSettings?.progressPage?.showCertificateStatus ?? true,
      }}
      validationSchema={{
        enableProgressGraph: Yup.boolean(),
        showGrades: Yup.boolean(),
        showGradeBreakdown: Yup.boolean(),
        showRelatedLinks: Yup.boolean(),
        showCertificateStatus: Yup.boolean(),
      }}
      onSettingsSave={handleSettingsSave}
    >
      {
        ({ handleChange, handleBlur, values }) => (
          <>
            {showProgressGraphSetting && (
              <FormSwitchGroup
                id="enable-progress-graph"
                name="enableProgressGraph"
                label={intl.formatMessage(messages.enableGraphLabel)}
                helpText={intl.formatMessage(messages.enableGraphHelp)}
                onChange={handleChange}
                onBlur={handleBlur}
                checked={values.enableProgressGraph}
              />
            )}
            <FormSwitchGroup
              id="show-grades"
              name="showGrades"
              label={intl.formatMessage(messages.showGradesLabel)}
              helpText={intl.formatMessage(messages.showGradesHelp)}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.showGrades}
            />
            <FormSwitchGroup
              id="show-grade-breakdown"
              name="showGradeBreakdown"
              label={intl.formatMessage(messages.showGradeBreakdownLabel)}
              helpText={intl.formatMessage(messages.showGradeBreakdownHelp)}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.showGradeBreakdown}
            />
            <FormSwitchGroup
              id="show-related-links"
              name="showRelatedLinks"
              label={intl.formatMessage(messages.showRelatedLinksLabel)}
              helpText={intl.formatMessage(messages.showRelatedLinksHelp)}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.showRelatedLinks}
            />
            <FormSwitchGroup
              id="show-certificate-status"
              name="showCertificateStatus"
              label={intl.formatMessage(messages.showCertificateStatusLabel)}
              helpText={intl.formatMessage(messages.showCertificateStatusHelp)}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.showCertificateStatus}
            />
          </>
        )
      }
    </AppSettingsModal>
  );
};

ProgressSettings.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ProgressSettings;
