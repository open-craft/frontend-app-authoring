import React, { useEffect, useState, useRef } from 'react';
import type { VideosState } from '../data/slice';
import { useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { Button, Stack } from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import ErrorAlert from '../../../editors/sharedComponents/ErrorAlerts/ErrorAlert';
import { getLanguages, getSortedTranscripts } from '../data/utils';
import Transcript from './transcript-item';
import {
  deleteVideoTranscript,
  downloadVideoTranscript,
  resetErrors,
  uploadVideoTranscript,
} from '../data/thunks';
import { RequestStatus } from '../../../data/constants';
import messages from './messages';

type TranscriptVideo = { transcripts: string[]; id: string; displayName: string; };
type TranscriptData = { language: string; newLanguage?: string; file?: File; };
type TranscriptPageSettings = {
  transcriptAvailableLanguages: Array<{ languageCode: string; languageText: string; }>;
  videoTranscriptSettings: {
    transcriptDeleteHandlerUrl: string;
    transcriptUploadHandlerUrl: string;
    transcriptDownloadHandlerUrl: string;
  };
};
type TranscriptState = Omit<VideosState, 'pageSettings'> & { pageSettings: TranscriptPageSettings; };
type TranscriptTabProps = { video: TranscriptVideo; };

const TranscriptTab = ({ video }: TranscriptTabProps) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const divRef = useRef<HTMLDivElement>(null);
  const { transcriptStatus, errors, pageSettings } = useSelector(
    (state: { videos: TranscriptState; }) => state.videos,
  );
  const {
    transcriptAvailableLanguages,
    videoTranscriptSettings,
  } = pageSettings;
  const {
    transcriptDeleteHandlerUrl,
    transcriptUploadHandlerUrl,
    transcriptDownloadHandlerUrl,
  } = videoTranscriptSettings;
  const { transcripts, id, displayName } = video;
  const languages = getLanguages(transcriptAvailableLanguages);
  const sortedTranscripts = getSortedTranscripts(languages, transcripts);
  const [previousSelection, setPreviousSelection] = useState<string[]>(sortedTranscripts);

  useEffect(() => {
    dispatch(resetErrors({ errorType: 'transcript' }));
    setPreviousSelection(getSortedTranscripts(languages, transcripts));
  }, [transcripts]);

  const handleAddEmptyTranscript = () => {
    setPreviousSelection(['', ...previousSelection]);
    if (divRef?.current?.scrollTo) {
      divRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTranscript = (data: TranscriptData, actionType: 'delete' | 'download' | 'upload') => {
    const {
      language,
      newLanguage,
      file,
    } = data;
    dispatch(resetErrors({ errorType: 'transcript' }));
    switch (actionType) {
      case 'delete':
        if (isEmpty(language)) {
          const updatedSelection = previousSelection;
          updatedSelection.shift();
          setPreviousSelection(updatedSelection);
        } else {
          dispatch(deleteVideoTranscript({
            language,
            videoId: id,
            apiUrl: transcriptDeleteHandlerUrl,
            transcripts,
          }));
        }
        break;
      case 'download':
        dispatch(downloadVideoTranscript({
          filename: `${displayName}-${language}.srt`,
          language,
          videoId: id,
          apiUrl: transcriptDownloadHandlerUrl,
        }));
        break;
      case 'upload':
        dispatch(uploadVideoTranscript({
          language,
          videoId: id,
          apiUrl: transcriptUploadHandlerUrl,
          newLanguage,
          file,
          transcripts,
        }));
        break;
      default:
        break;
    }
  };

  return (
    <Stack gap={3}>
      <div ref={divRef} style={{ overflowY: 'auto', maxHeight: '310px' }} className="px-1 py-2">
        <ErrorAlert
          hideHeading={false}
          isError={transcriptStatus === RequestStatus.FAILED && !isEmpty(errors.transcript)}
        >
          <ul className="p-0">
            {errors.transcript.map(message => (
              <li key={`transcript-error-${message}`} style={{ listStyle: 'none' }}>
                {intl.formatMessage(messages.errorAlertMessage, { message })}
              </li>
            ))}
          </ul>
        </ErrorAlert>
        {previousSelection.map((transcript, idx) => (
          <Transcript
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            {...{
              languages,
              transcript,
              previousSelection,
              handleTranscript,
            }}
          />
        ))}
      </div>
      <div className="border-top border-light-400">
        <Button
          variant="link"
          iconBefore={Add}
          size="sm"
          className="text-primary-500 justify-content-start pl-0 pt-3"
          onClick={handleAddEmptyTranscript}
        >
          {intl.formatMessage(messages.uploadButtonLabel)}
        </Button>
      </div>
    </Stack>
  );
};

export default TranscriptTab;
