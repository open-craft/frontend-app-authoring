import { Helmet } from 'react-helmet';
import classNames from 'classnames';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Breadcrumb,
  Button,
  Container,
  Icon,
} from '@openedx/paragon';
import { ArrowBack, InfoOutline } from '@openedx/paragon/icons';
import {
  Link,
} from 'react-router-dom';

import Loading from '../../generic/Loading';
import NotFoundAlert from '../../generic/NotFoundAlert';
import { LibrarySidebar } from '../library-sidebar';
import LibrarySubHeader from '../LibrarySubHeader';
import { SidebarBodyComponentId, useLibraryContext } from '../common/context';
import messages from '../messages';

const HeaderActions = () => {
  const intl = useIntl();
  const {
    openInfoSidebar,
    closeLibrarySidebar,
    sidebarComponentInfo,
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
    </div>
  );
};

interface LibraryComponentPickerProps {
  returnToLibrarySelection?: () => void,
}

const LibraryComponentPicker = ({ returnToLibrarySelection }: LibraryComponentPickerProps) => {
  const intl = useIntl();

  const {
    libraryData,
    isLoadingLibraryData,
    restrictToLibrary,
    sidebarComponentInfo,
  } = useLibraryContext();

  if (isLoadingLibraryData) {
    return <Loading />;
  }

  if (!libraryData) {
    return <NotFoundAlert />;
  }

  const breadcrumbs = !restrictToLibrary ? (
    <Breadcrumb
      links={[
        {
          label: '',
          to: '',
        },
        {
          label: intl.formatMessage(messages.returnToLibrarySelection),
          onClick: returnToLibrarySelection,
        },
      ]}
      spacer={<Icon src={ArrowBack} size="sm" />}
      linkAs={Link}
    />
  ) : undefined;

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <Helmet><title>{libraryData.title} | {process.env.SITE_NAME}</title></Helmet>
        <Container className="px-4 mt-4 mb-5 library-authoring-page">
          <LibrarySubHeader
            subtitle=""
            headerActions={<HeaderActions />}
            breadcrumbs
          />
        </Container>
      </div>
      {!!sidebarComponentInfo?.type && (
        <div className="library-authoring-sidebar box-shadow-left-1 bg-white" data-testid="library-sidebar">
          <LibrarySidebar />
        </div>
      )}
    </div>
  );
};

export default LibraryComponentPicker;
