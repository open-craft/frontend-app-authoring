import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { act, render } from '@testing-library/react';
import PropTypes from 'prop-types';

import ContentTagsCollapsible from './ContentTagsCollapsible';

jest.mock('./data/apiHooks', () => ({
  useContentTaxonomyTagsMutation: jest.fn(() => ({
    isError: false,
  })),
}));

const data = {
  contentId: 'block-v1:SampleTaxonomyOrg1+STC1+2023_1+type@vertical+block@7f47fe2dbcaf47c5a071671c741fe1ab',
  taxonomyAndTagsData: {
    id: 123,
    name: 'Taxonomy 1',
    contentTags: [
      {
        value: 'Tag 1',
        lineage: ['Tag 1'],
      },
      {
        value: 'Tag 2',
        lineage: ['Tag 2'],
      },
    ],
  },
  editable: true,
};

const ContentTagsCollapsibleComponent = ({ contentId, taxonomyAndTagsData, editable }) => (
  <IntlProvider locale="en" messages={{}}>
    <ContentTagsCollapsible contentId={contentId} taxonomyAndTagsData={taxonomyAndTagsData} editable={editable} />
  </IntlProvider>
);

ContentTagsCollapsibleComponent.propTypes = {
  contentId: PropTypes.string.isRequired,
  taxonomyAndTagsData: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    contentTags: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.string,
      lineage: PropTypes.arrayOf(PropTypes.string),
    })),
  }).isRequired,
  editable: PropTypes.bool.isRequired,
};

describe('<ContentTagsCollapsible />', () => {
  it('should render taxonomy tags data along content tags number badge', async () => {
    await act(async () => {
      const { container, getByText } = render(
        <ContentTagsCollapsibleComponent
          contentId={data.contentId}
          taxonomyAndTagsData={data.taxonomyAndTagsData}
          editable={data.editable}
        />,
      );
      expect(getByText('Taxonomy 1')).toBeInTheDocument();
      expect(container.getElementsByClassName('badge').length).toBe(1);
      expect(getByText('2')).toBeInTheDocument();
    });
  });

  it('should render taxonomy tags data without tags number badge', async () => {
    data.taxonomyAndTagsData.contentTags = [];
    await act(async () => {
      const { container, getByText } = render(
        <ContentTagsCollapsibleComponent
          contentId={data.contentId}
          taxonomyAndTagsData={data.taxonomyAndTagsData}
          editable={data.editable}
        />,
      );
      expect(getByText('Taxonomy 1')).toBeInTheDocument();
      expect(container.getElementsByClassName('invisible').length).toBe(1);
    });
  });
});
