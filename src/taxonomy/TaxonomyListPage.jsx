import React, { useContext, useState } from 'react';
import {
  Button,
  CardView,
  Container,
  DataTable,
  Dropdown,
  OverlayTrigger,
  Spinner,
  Tooltip,
  SelectMenu,
  MenuItem,
} from '@edx/paragon';
import {
  Add,
  Check,
} from '@edx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Helmet } from 'react-helmet';
import SubHeader from '../generic/sub-header/SubHeader';
import getPageHeadTitle from '../generic/utils';
import messages from './messages';
import TaxonomyCard from './taxonomy-card';
import { getTaxonomyTemplateApiUrl } from './data/api';
import { useTaxonomyListDataResponse, useIsTaxonomyListDataLoaded, useDeleteTaxonomy } from './data/apiHooks';
import { useOrganizationListData } from '../generic/data/apiHooks';
import { TaxonomyContext } from './common/context';

const TaxonomyListHeaderButtons = () => {
  const intl = useIntl();
  return (
    <>
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip>
            {intl.formatMessage(messages.downloadTemplateButtonHint)}
          </Tooltip>
        )}
      >
        <Dropdown>
          <Dropdown.Toggle
            variant="outline-primary"
            data-testid="taxonomy-download-template"
          >
            {intl.formatMessage(messages.downloadTemplateButtonLabel)}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              href={getTaxonomyTemplateApiUrl('csv')}
              data-testid="taxonomy-download-template-csv"
            >
              {intl.formatMessage(messages.downloadTemplateButtonCSVLabel)}
            </Dropdown.Item>
            <Dropdown.Item
              href={getTaxonomyTemplateApiUrl('json')}
              data-testid="taxonomy-download-template-json"
            >
              {intl.formatMessage(messages.downloadTemplateButtonJSONLabel)}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </OverlayTrigger>
      <Button iconBefore={Add} disabled>
        {intl.formatMessage(messages.importButtonLabel)}
      </Button>
    </>
  );
};

const TaxonomyListPage = () => {
  const intl = useIntl();
  const deleteTaxonomy = useDeleteTaxonomy();
  const { setToastMessage } = useContext(TaxonomyContext);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('All taxonomies');

  const onDeleteTaxonomy = React.useCallback((id, name) => {
    deleteTaxonomy({ pk: id }, {
      onSuccess: async () => {
        setToastMessage(intl.formatMessage(messages.taxonomyDeleteToast, { name }));
      },
      onError: async () => {
        // TODO: display the error to the user
      },
    });
  }, [setToastMessage]);

  const {
    data: organizationListData,
    isSuccess: isOrganizationListLoaded,
  } = useOrganizationListData();

  const useTaxonomyListData = () => {
    const taxonomyListData = useTaxonomyListDataResponse(selectedOrgFilter);
    const isLoaded = useIsTaxonomyListDataLoaded(selectedOrgFilter);
    return { taxonomyListData, isLoaded };
  };
  const { taxonomyListData, isLoaded } = useTaxonomyListData();

  const isOrgSelected = (value) => (value === selectedOrgFilter ? <Check /> : null);

  const getOrgSelect = () => {
    // Organization select component

    const selectOptions = [
      <MenuItem
        key="all-orgs-taxonomies"
        className="x-small"
        iconAfter={() => isOrgSelected('All taxonomies')}
        onClick={() => setSelectedOrgFilter('All taxonomies')}
      >
        { isOrgSelected('All taxonomies')
          ? intl.formatMessage(messages.orgInputSelectDefaultValue)
          : intl.formatMessage(messages.orgAllValue)}
      </MenuItem>,
      <MenuItem
        key="unassigned-taxonomies"
        className="x-small"
        iconAfter={() => isOrgSelected('Unassigned')}
        onClick={() => setSelectedOrgFilter('Unassigned')}
      >
        { intl.formatMessage(messages.orgUnassignedValue) }
      </MenuItem>,
    ];

    if (isOrganizationListLoaded && organizationListData) {
      organizationListData.map(org => (
        selectOptions.push(
          <MenuItem
            key={`${org}-taxonomies`}
            className="x-small"
            iconAfter={() => isOrgSelected(org)}
            onClick={() => setSelectedOrgFilter(org)}
          >
            {org}
          </MenuItem>,
        )
      ));
    }

    return (
      <SelectMenu
        className="flex-d x-small"
        variant="tertiary"
        defaultMessage={intl.formatMessage(messages.orgInputSelectDefaultValue)}
      >
        { isOrganizationListLoaded
          ? selectOptions
          : (
            <Spinner
              animation="border"
              size="xl"
              screenReaderText={intl.formatMessage(messages.usageLoadingMessage)}
            />
          )}
      </SelectMenu>
    );
  };

  return (
    <>
      <Helmet>
        <title>{getPageHeadTitle('', intl.formatMessage(messages.headerTitle))}</title>
      </Helmet>
      <div className="pt-4.5 pr-4.5 pl-4.5 pb-2 bg-light-100 box-shadow-down-2">
        <Container size="xl">
          <SubHeader
            title={intl.formatMessage(messages.headerTitle)}
            titleActions={getOrgSelect()}
            headerActions={<TaxonomyListHeaderButtons />}
            hideBorder
          />
        </Container>
      </div>
      <div className="bg-light-400 mt-1">
        <Container size="xl">
          {isLoaded && (
            <DataTable
              disableElevation
              data={taxonomyListData.results}
              itemCount={taxonomyListData.results.length}
              columns={[
                {
                  Header: 'id',
                  accessor: 'id',
                },
                {
                  Header: 'name',
                  accessor: 'name',
                },
                {
                  Header: 'description',
                  accessor: 'description',
                },
                {
                  Header: 'systemDefined',
                  accessor: 'systemDefined',
                },
                {
                  accessor: 'tagsCount',
                },
              ]}
            >
              <CardView
                className="bg-light-400 p-5"
                CardComponent={(row) => TaxonomyCard({ ...row, onDeleteTaxonomy })}
              />
            </DataTable>
          )}
          {!isLoaded && (
            <Container className="d-flex justify-content-center mt-6">
              <Spinner
                animation="border"
                size="xl"
                screenReaderText={intl.formatMessage(messages.usageLoadingMessage)}
              />
            </Container>
          )}
        </Container>
      </div>
    </>
  );
};

TaxonomyListPage.propTypes = {};

export default TaxonomyListPage;
