import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Tabs,
  Tab,
} from '@openedx/paragon';
import InfoTab from './InfoTab';
import TranscriptTab from './TranscriptTab';
import messages from './messages';
import { TRANSCRIPT_FAILURE_STATUSES } from '../data/constants';

type Video = {
  displayName: string;
  wrapperType: string;
  id: string;
  dateAdded: string;
  fileSize: number;
  transcripts: string[];
  transcriptionStatus: string;
};

type VideoInfoModalSidebarProps = {
  video: Video;
  activeTab: string;
  setActiveTab: (tab: string | null) => void;
};

const VideoInfoModalSidebar = ({ video, activeTab, setActiveTab }: VideoInfoModalSidebarProps) => {
  const intl = useIntl();

  return (
    <Tabs
      id="controlled-info-sidebar-tab"
      activeKey={activeTab}
      onSelect={(tab) => setActiveTab(tab)}
    >
      <Tab eventKey="fileInfo" title={intl.formatMessage(messages.infoTabTitle)}>
        <InfoTab {...{ video }} />
      </Tab>
      <Tab
        eventKey="fileTranscripts"
        title={intl.formatMessage(
          messages.transcriptTabTitle,
          { transcriptCount: video.transcripts.length },
        )}
        notification={TRANSCRIPT_FAILURE_STATUSES.includes(video.transcriptionStatus) && (
          <span>
            <span className="sr-only">{intl.formatMessage(messages.notificationScreenReaderText)}</span>
          </span>
        )}
      >
        <TranscriptTab {...{ video }} />
      </Tab>
    </Tabs>
  );
};

export default VideoInfoModalSidebar;
