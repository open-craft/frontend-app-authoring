import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import classNames from 'classnames';
import { StudioFooter } from '@edx/frontend-component-footer';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  Container,
} from '@openedx/paragon';
import { Add, InfoOutline } from '@openedx/paragon/icons';

import Loading from '../generic/Loading';
import Header from '../header';
import NotFoundAlert from '../generic/NotFoundAlert';
import { LibrarySidebar } from './library-sidebar';
import LibrarySubHeader from './LibrarySubHeader';
import { SidebarBodyComponentId, useLibraryContext } from './common/context';
import messages from './messages';

const HeaderActions = () => {
  const intl = useIntl();
  const {
    openAddContentSidebar,
    openInfoSidebar,
    closeLibrarySidebar,
    sidebarComponentInfo,
    readOnly,
  } = useLibraryContext();

  const infoSidebarIsOpen = () => (
    sidebarComponentInfo?.type === SidebarBodyComponentId.Info
  );

  const handleOnClickInfoSidebar = () => {
    if (infoSidebarIsOpen()) {
      closeLibrarySidebar();
    } else {
      openInfoSidebar();
    }
  };

  return (
    <div className="header-actions">
      <Button
        className={classNames('mr-1', {
          'normal-border': !infoSidebarIsOpen(),
          'open-border': infoSidebarIsOpen(),
        })}
        iconBefore={InfoOutline}
        variant="outline-primary rounded-0"
        onClick={handleOnClickInfoSidebar}
      >
        {intl.formatMessage(messages.libraryInfoButton)}
      </Button>
      <Button
        className="ml-1"
        iconBefore={Add}
        variant="primary rounded-0"
        onClick={openAddContentSidebar}
        disabled={readOnly}
      >
        {intl.formatMessage(messages.newContentButton)}
      </Button>
    </div>
  );
};

const LibraryAuthoringPage: React.FC<Record<never, never>> = () => {
  const intl = useIntl();

  const {
    libraryId,
    libraryData,
    isLoadingLibraryData,
    sidebarComponentInfo,
    openInfoSidebar,
  } = useLibraryContext();

  useEffect(() => {
    openInfoSidebar();
  }, []);

  if (isLoadingLibraryData) {
    return <Loading />;
  }

  if (!libraryData) {
    return <NotFoundAlert />;
  }

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <Helmet><title>{libraryData.title} | {process.env.SITE_NAME}</title></Helmet>
        <Header
          number={libraryData.slug}
          title={libraryData.title}
          org={libraryData.org}
          contextId={libraryId}
          isLibrary
          containerProps={{
            size: undefined,
          }}
        />
        <Container className="px-4 mt-4 mb-5 library-authoring-page">
          <LibrarySubHeader
            subtitle={intl.formatMessage(messages.headingSubtitle)}
            headerActions={<HeaderActions />}
          />
        </Container>
        <StudioFooter containerProps={{ size: undefined }} />
      </div>
      {!!sidebarComponentInfo?.type && (
        <div className="library-authoring-sidebar box-shadow-left-1 bg-white" data-testid="library-sidebar">
          <LibrarySidebar />
        </div>
      )}
    </div>
  );
};

export default LibraryAuthoringPage;
