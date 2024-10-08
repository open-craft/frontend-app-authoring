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
        showGradeSummary: values.showGradeSummary,
        showRelatedLinks: values.showRelatedLinks,
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
        showGrades: !!otherCourseSettings?.progressPage?.showGrades,
        showGradeSummary: !!otherCourseSettings?.progressPage?.showGradeSummary,
        showRelatedLinks: !!otherCourseSettings?.progressPage?.showRelatedLinks,
      }}
      validationSchema={{
        enableProgressGraph: Yup.boolean(),
        showGrades: Yup.boolean(),
        showGradeSummary: Yup.boolean(),
        showRelatedLinks: Yup.boolean(),
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
              id="show-grade-summary"
              name="showGradeSummary"
              label={intl.formatMessage(messages.showGradeSummaryLabel)}
              helpText={intl.formatMessage(messages.showGradeSummaryHelp)}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.showGradeSummary}
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
