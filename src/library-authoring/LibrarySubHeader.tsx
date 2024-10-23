import React, { useEffect, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge,
  Breadcrumb,
  Stack,
  Tab,
  Tabs,
} from '@openedx/paragon';

import SubHeader from '../generic/sub-header/SubHeader';
import {
  ClearFiltersButton,
  FilterByBlockType,
  FilterByTags,
  SearchContextProvider,
  SearchKeywordsField,
  SearchSortWidget,
} from '../search-manager';

import LibraryComponents from './components/LibraryComponents';
import LibraryCollections from './collections/LibraryCollections';
import LibraryHome from './LibraryHome';
import { useLibraryContext } from './common/context';
import messages from './messages';

enum TabList {
  home = '',
  components = 'components',
  collections = 'collections',
}

interface TabContentProps {
  eventKey: string;
  handleTabChange: (key: string) => void;
}

const TabContent = ({ eventKey, handleTabChange }: TabContentProps) => {
  switch (eventKey) {
    case TabList.components:
      return <LibraryComponents variant="full" />;
    case TabList.collections:
      return <LibraryCollections variant="full" />;
    default:
      return <LibraryHome tabList={TabList} handleTabChange={handleTabChange} />;
  }
};

const LibraryTabs: React.FC<Record<never, never>> = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const {
    libraryId,
    componentPickerMode,
  } = useLibraryContext();
  const [activeKey, setActiveKey] = useState<string>('');

  useEffect(() => {
    const currentPath = location.pathname.split('/').pop();

    if (componentPickerMode || currentPath === libraryId || currentPath === '') {
      setActiveKey(TabList.home);
    } else if (currentPath && currentPath in TabList) {
      setActiveKey(TabList[currentPath]);
    }
  }, [location.pathname]);

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    if (!componentPickerMode) {
      navigate({
        pathname: key,
        search: searchParams.toString(),
      });
    }
  };

  return (
    <>
      <Tabs
        variant="tabs"
        activeKey={activeKey}
        onSelect={handleTabChange}
        className="my-3"
      >
        <Tab eventKey={TabList.home} title={intl.formatMessage(messages.homeTab)} />
        <Tab eventKey={TabList.components} title={intl.formatMessage(messages.componentsTab)} />
        <Tab eventKey={TabList.collections} title={intl.formatMessage(messages.collectionsTab)} />
      </Tabs>
      <TabContent eventKey={activeKey} handleTabChange={handleTabChange} />
    </>
  );
};

const LibrarySearch: React.FC<Record<never, never>> = () => {
  const {
    libraryId,
    showOnlyPublished,
  } = useLibraryContext();

  const extraFilter = [`context_key = "${libraryId}"`];
  if (showOnlyPublished) {
    extraFilter.push('last_published IS NOT NULL');
  }

  return (
    <SearchContextProvider extraFilter={extraFilter}>
      <SearchKeywordsField className="w-50" />
      <div className="d-flex mt-3 align-items-center">
        <FilterByTags />
        <FilterByBlockType />
        <ClearFiltersButton />
        <div className="flex-grow-1" />
        <SearchSortWidget />
      </div>
      <LibraryTabs />
    </SearchContextProvider>
  );
};

const SubHeaderTitle = ({ title }: { title: string }) => {
  const intl = useIntl();

  const { readOnly } = useLibraryContext();

  return (
    <Stack direction="vertical">
      {title}
      {readOnly && (
        <div>
          <Badge variant="primary" style={{ fontSize: '50%' }}>
            {intl.formatMessage(messages.readOnlyBadge)}
          </Badge>
        </div>
      )}
    </Stack>
  );
};

interface LibrarySubHeaderProps {
  headerActions: React.component,
  subtitle: string,
  breadcrumbs?: Breadcrumb,
}

const LibrarySubHeader = ({ breadcrumbs, headerActions, subtitle }: LibrarySubHeaderProps) => {
  const {
    libraryData,
  } = useLibraryContext();

  return (
    <>
      <SubHeader
        title={<SubHeaderTitle title={libraryData.title} />}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        headerActions={headerActions}
      />
      <LibraryTabs />
    </>
  );
};

export default LibrarySubHeader;
