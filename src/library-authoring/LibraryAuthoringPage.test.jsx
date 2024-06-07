import MockAdapter from 'axios-mock-adapter';
import { initializeMockApp } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppProvider } from '@edx/frontend-platform/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock-jest';

import initializeStore from '../store';
import { getContentSearchConfigUrl } from '../search-modal/data/api';
import mockResult from '../search-modal/__mocks__/search-result.json';
import mockEmptyResult from '../search-modal/__mocks__/empty-search-result.json';
import LibraryAuthoringPage from './LibraryAuthoringPage';
import { getContentLibraryApiUrl } from './data/api';

let store;
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
let axiosMock;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate(),
}));

const searchEndpoint = 'http://mock.meilisearch.local/multi-search';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const returnEmptyResult = (_url, req) => {
  const requestData = JSON.parse(req.body?.toString() ?? '');
  const query = requestData?.queries[0]?.q ?? '';
  // We have to replace the query (search keywords) in the mock results with the actual query,
  // because otherwise we may have an inconsistent state that causes more queries and unexpected results.
  mockEmptyResult.results[0].query = query;
  // And fake the required '_formatted' fields; it contains the highlighting <mark>...</mark> around matched words
  // eslint-disable-next-line no-underscore-dangle, no-param-reassign
  mockEmptyResult.results[0]?.hits.forEach((hit) => { hit._formatted = { ...hit }; });
  return mockEmptyResult;
};

const libraryData = {
  id: 'lib:org1:lib1',
  type: 'complex',
  org: 'org1',
  slug: 'lib1',
  title: 'lib1',
  description: 'lib1',
  numBlocks: 2,
  version: 0,
  lastPublished: null,
  allowLti: false,
  allowPublic_learning: false,
  allowPublic_read: false,
  hasUnpublished_changes: true,
  hasUnpublished_deletes: false,
  license: '',
};

const RootWrapper = () => (
  <AppProvider store={store}>
    <IntlProvider locale="en" messages={{}}>
      <QueryClientProvider client={queryClient}>
        <LibraryAuthoringPage />
      </QueryClientProvider>
    </IntlProvider>
  </AppProvider>
);

describe('<LibraryAuthoringPage />', () => {
  beforeEach(() => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });
    store = initializeStore();
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    mockUseParams.mockReturnValue({ libraryId: '1' });

    // The API method to get the Meilisearch connection details uses Axios:
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    axiosMock.onGet(getContentSearchConfigUrl()).reply(200, {
      url: 'http://mock.meilisearch.local',
      index_name: 'studio',
      api_key: 'test-key',
    });
    //
    // The Meilisearch client-side API uses fetch, not Axios.
    fetchMock.post(searchEndpoint, (_url, req) => {
      const requestData = JSON.parse(req.body?.toString() ?? '');
      const query = requestData?.queries[0]?.q ?? '';
      // We have to replace the query (search keywords) in the mock results with the actual query,
      // because otherwise Instantsearch will update the UI and change the query,
      // leading to unexpected results in the test cases.
      mockResult.results[0].query = query;
      // And fake the required '_formatted' fields; it contains the highlighting <mark>...</mark> around matched words
      // eslint-disable-next-line no-underscore-dangle, no-param-reassign
      mockResult.results[0]?.hits.forEach((hit) => { hit._formatted = { ...hit }; });
      return mockResult;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    axiosMock.restore();
    fetchMock.mockReset();
    queryClient.clear();
  });

  it('shows the spinner before the query is complete', () => {
    // Use unresolved promise to keep the Loading visible
    mockUseParams.mockReturnValue({ libraryId: '1' });
    axiosMock.onGet(getContentLibraryApiUrl('1')).reply(() => new Promise());
    const { getByRole } = render(<RootWrapper />);
    const spinner = getByRole('status');
    expect(spinner.textContent).toEqual('Loading...');
  });

  it('shows an error component if no library returned', async () => {
    mockUseParams.mockReturnValue({ libraryId: 'invalid' });
    axiosMock.onGet(getContentLibraryApiUrl('invalid')).reply(400);

    const { findByTestId } = render(<RootWrapper />);

    expect(await findByTestId('notFoundAlert')).toBeInTheDocument();
  });

  it('shows an error component if no library param', async () => {
    mockUseParams.mockReturnValue({ libraryId: '' });

    const { findByTestId } = render(<RootWrapper />);

    expect(await findByTestId('notFoundAlert')).toBeInTheDocument();
  });

  it('show library data', async () => {
    mockUseParams.mockReturnValue({ libraryId: libraryData.id });
    axiosMock.onGet(getContentLibraryApiUrl(libraryData.id)).reply(200, libraryData);

    const { findByRole, getByText, queryByText } = render(<RootWrapper />);

    expect(await findByRole('heading', `Content library${libraryData.title}`)).toBeInTheDocument();

    // Ensure the search endpoint is called
    await waitFor(() => { expect(fetchMock).toHaveFetchedTimes(1, searchEndpoint, 'post'); });

    expect(queryByText('You have not added any content to this library yet.')).not.toBeInTheDocument();

    expect(getByText('Components (6)')).toBeInTheDocument();
    expect(getByText('There are 6 components in this library')).toBeInTheDocument();
  });

  it('show library without components', async () => {
    mockUseParams.mockReturnValue({ libraryId: libraryData.id });
    axiosMock.onGet(getContentLibraryApiUrl(libraryData.id)).reply(200, libraryData);
    fetchMock.post(searchEndpoint, returnEmptyResult, { overwriteRoutes: true });

    const { findByRole, getByText } = render(<RootWrapper />);

    expect(await findByRole('heading', `Content library${libraryData.title}`)).toBeInTheDocument();

    // Ensure the search endpoint is called
    await waitFor(() => { expect(fetchMock).toHaveFetchedTimes(1, searchEndpoint, 'post'); });

    expect(getByText('You have not added any content to this library yet.')).toBeInTheDocument();
  });
});
