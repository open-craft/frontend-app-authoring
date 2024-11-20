import { useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Container, Spinner } from '@openedx/paragon';
import CourseVideosSlot from 'CourseAuthoring/plugin-slots/CourseVideosSlot';
import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Placeholder from '@edx/frontend-lib-content-components';
import { RequestStatus } from '../../data/constants';

import { EditFileErrors } from '../generic';
import { resetErrors } from './data/thunks';
import messages from './messages';
import VideosPageProvider from './VideosPageProvider';

const VideosPage = ({
  courseId,
}) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const {
    loadingStatus,
    addingStatus: addVideoStatus,
    deletingStatus: deleteVideoStatus,
    updatingStatus: updateVideoStatus,
    errors: errorMessages,
  } = useSelector((state) => state.videos);
  const handleErrorReset = (error) => dispatch(resetErrors(error));
  if (loadingStatus === RequestStatus.DENIED) {
    return (
      <div data-testid="under-construction-placeholder" className="row justify-contnt-center m-6">
        <Placeholder />
      </div>
    );
  }

  return (
    <VideosPageProvider courseId={courseId}>
      <Container size="xl" className="p-4 pt-4.5">
        <EditFileErrors
          resetErrors={handleErrorReset}
          errorMessages={errorMessages}
          addFileStatus={addVideoStatus}
          deleteFileStatus={deleteVideoStatus}
          updateFileStatus={updateVideoStatus}
          loadingStatus={loadingStatus}
        />
        <Alert variant="warning" show={addVideoStatus === RequestStatus.IN_PROGRESS}>
          <div className="video-upload-warning-text"><Spinner animation="border" variant="warning" className="video-upload-spinner mr-3" screenReaderText="loading" />
            <p className="d-inline">{intl.formatMessage(messages.videoUploadAlertLabel)}</p>
          </div>
        </Alert>
        <h2>{intl.formatMessage(messages.heading)}</h2>
        <CourseVideosSlot courseId={courseId} />
      </Container>
    </VideosPageProvider>
  );
};

VideosPage.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default VideosPage;
