import PropTypes from 'prop-types';
import { Stack, Form } from '@openedx/paragon';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import { DatepickerControl, DATEPICKER_TYPES } from '../datepicker-control';
import messages from './messages';

const BasicTab = ({
  values,
  setFieldValue,
  courseGraders,
  isSubsection,
  isSelfPaced,
  enableCompletionTracking,
  ancestorHasOptionalCompletion,
}) => {
  const intl = useIntl();

  const {
    releaseDate,
    graderType,
    dueDate,
    optionalCompletion,
  } = values;

  const onOptionalCompletionChange = (e) => setFieldValue('optionalCompletion', e.target.checked);

  const onChangeGraderType = (e) => setFieldValue('graderType', e.target.value);

  const createOptions = () => courseGraders.map((option) => (
    <option key={option} value={option}> {option} </option>
  ));

  return (
    <>
      {!isSelfPaced && (
        <>
          <h5 className="mt-4 text-gray-700"><FormattedMessage {...messages.releaseDateAndTime} /></h5>
          <hr />
          <div data-testid="release-date-stack">
            <Stack className="mt-3" direction="horizontal" gap={5}>
              <DatepickerControl
                type={DATEPICKER_TYPES.date}
                value={releaseDate}
                label={intl.formatMessage(messages.releaseDate)}
                controlName="state-date"
                onChange={(val) => setFieldValue('releaseDate', val)}
              />
              <DatepickerControl
                type={DATEPICKER_TYPES.time}
                value={releaseDate}
                label={intl.formatMessage(messages.releaseTimeUTC)}
                controlName="start-time"
                onChange={(val) => setFieldValue('releaseDate', val)}
              />
            </Stack>
          </div>
        </>
      )}
      {enableCompletionTracking && (
        <div className="edit-optional-completion">
          <h5 className="mt-4 text-gray-700">
            <FormattedMessage {...messages.optionalCompletionTitle} />
          </h5>
          <hr />
          <Form.Checkbox
            checked={!!optionalCompletion}
            onChange={onOptionalCompletionChange}
            disabled={!!ancestorHasOptionalCompletion}
            data-testid="optional-completion-checkbox"
          >
            <FormattedMessage {...messages.optionalCompletionLabel} />
          </Form.Checkbox>
          {ancestorHasOptionalCompletion && (
            <Form.Text className="text-warning">
              <FormattedMessage {...messages.optionalCompletionAncestorTip} />
            </Form.Text>
          )}
          <Form.Text>
            <FormattedMessage {...messages.optionalCompletionDescription} />
          </Form.Text>
        </div>
      )}
      {
        isSubsection && (
          <div>
            <h5 className="mt-4 text-gray-700"><FormattedMessage {...messages.grading} /></h5>
            <hr />
            <Form.Group>
              <Form.Label><FormattedMessage {...messages.gradeAs} /></Form.Label>
              <Form.Control
                as="select"
                defaultValue={graderType}
                onChange={onChangeGraderType}
                data-testid="grader-type-select"
              >
                <option key="notgraded" value="notgraded">
                  {intl.formatMessage(messages.notGradedTypeOption)}
                </option>
                {createOptions()}
              </Form.Control>
            </Form.Group>
            {!isSelfPaced && (
              <div data-testid="due-date-stack">
                <Stack className="mt-3" direction="horizontal" gap={5}>
                  <DatepickerControl
                    type={DATEPICKER_TYPES.date}
                    value={dueDate}
                    label={intl.formatMessage(messages.dueDate)}
                    controlName="state-date"
                    onChange={(val) => setFieldValue('dueDate', val)}
                    data-testid="due-date-picker"
                  />
                  <DatepickerControl
                    type={DATEPICKER_TYPES.time}
                    value={dueDate}
                    label={intl.formatMessage(messages.dueTimeUTC)}
                    controlName="start-time"
                    onChange={(val) => setFieldValue('dueDate', val)}
                  />
                </Stack>
              </div>
            )}
          </div>
        )
      }
    </>
  );
};

BasicTab.defaultProps = {
  enableCompletionTracking: false,
  ancestorHasOptionalCompletion: false,
};

BasicTab.propTypes = {
  isSubsection: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    releaseDate: PropTypes.string.isRequired,
    graderType: PropTypes.string.isRequired,
    dueDate: PropTypes.string,
    optionalCompletion: PropTypes.bool,
  }).isRequired,
  courseGraders: PropTypes.arrayOf(PropTypes.string).isRequired,
  setFieldValue: PropTypes.func.isRequired,
  isSelfPaced: PropTypes.bool.isRequired,
  enableCompletionTracking: PropTypes.bool,
  ancestorHasOptionalCompletion: PropTypes.bool,
};

export default BasicTab;
