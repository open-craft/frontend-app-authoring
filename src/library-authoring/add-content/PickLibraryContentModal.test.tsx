import { mockContentSearchConfig, mockSearchResult } from '../../search-manager/data/api.mock';
import {
  fireEvent,
  render as baseRender,
  waitFor,
  screen,
  initializeMocks,
} from '../../testUtils';
import mockResult from '../__mocks__/library-search.json';
import { LibraryProvider } from '../common/context';
import {
  mockContentLibrary,
  mockGetCollectionMetadata,
} from '../data/api.mocks';
import { PickLibraryContentModal } from './PickLibraryContentModal';

initializeMocks();
mockContentSearchConfig.applyMock();
mockContentLibrary.applyMock();
mockGetCollectionMetadata.applyMock();
mockSearchResult(mockResult);

const { libraryId } = mockContentLibrary;

const onClose = jest.fn();
const mockAddComponentsToCollection = jest.fn();

jest.mock('../data/api', () => ({
  ...jest.requireActual('../data/api'),
  addComponentsToCollection: mockAddComponentsToCollection,
}));

const render = () => baseRender(<PickLibraryContentModal isOpen onClose={onClose} />, {
  path: '/library/:libraryId/collection/:collectionId/*',
  params: { libraryId, collectionId: 'collectionId' },
  extraWrapper: ({ children }) => (
    <LibraryProvider
      libraryId={libraryId}
      collectionId="collectionId"
    >
      {children}
    </LibraryProvider>
  ),
});

describe('<PickLibraryContentModal />', () => {
  it('can pick components from the modal', async () => {
    render();

    // Wait for the content library to load
    await screen.findByText('Test Library');

    await waitFor(() => expect(screen.queryAllByText('Introduction to Testing')[0]).toBeInTheDocument());

    // Select the first component
    fireEvent.click(screen.queryAllByRole('button', { name: 'Select' })[0]);
    expect(await screen.findByText('1 Selected Component(s)')).toBeInTheDocument();

    fireEvent.click(screen.queryAllByRole('button', { name: 'Add to Collection' })[0]);

    await waitFor(() => {
      expect(mockAddComponentsToCollection).toHaveBeenCalledWith(
        libraryId,
        'collectionId',
        ['lb:Axim:TEST:html:571fe018-f3ce-45c9-8f53-5dafcb422fdd'],
      );
    });
  });
});
