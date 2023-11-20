import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useSelector } from 'react-redux';
import { initializeMockApp } from '@edx/frontend-platform';
import MockAdapter from 'axios-mock-adapter';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { AppProvider } from '@edx/frontend-platform/react';

import initializeStore from '../../store';
import PublishModal from './PublishModal';
import messages from './messages';

// eslint-disable-next-line no-unused-vars
let axiosMock;
let store;
const mockPathname = '/foo-bar';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: mockPathname,
  }),
}));

const currentSectionMock = {
  displayName: 'Publish',
  childInfo: {
    displayName: 'Subsection',
    children: [
      {
        displayName: 'Subsection 1',
        id: 1,
        hasChanges: true,
        childInfo: {
          displayName: 'Unit',
          children: [
            {
              id: 11,
              displayName: 'Subsection_1 Unit 1',
              hasChanges: true,
            },
          ],
        },
      },
      {
        displayName: 'Subsection 2',
        id: 2,
        hasChanges: true,
        childInfo: {
          displayName: 'Unit',
          children: [
            {
              id: 21,
              displayName: 'Subsection_2 Unit 1',
              hasChanges: true,
            },
          ],
        },
      },
      {
        displayName: 'Subsection 3',
        id: 3,
        childInfo: {
          children: [],
        },
      },
    ],
  },
};

const onCloseMock = jest.fn();
const onPublishSubmitMock = jest.fn();

const renderComponent = () => render(
  <AppProvider store={store}>
    <IntlProvider locale="en">
      <PublishModal
        isOpen
        onClose={onCloseMock}
        onPublishSubmit={onPublishSubmitMock}
      />
    </IntlProvider>,
  </AppProvider>,
);

describe('<PublishModal />', () => {
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
    useSelector.mockReturnValue(currentSectionMock);
  });

  it('renders PublishModal component correctly', () => {
    const { getByText, getByRole, queryByText } = renderComponent();

    expect(getByText(`Publish ${currentSectionMock.displayName}`)).toBeInTheDocument();
    expect(getByText(messages.description.defaultMessage)).toBeInTheDocument();
    expect(getByText(/Subsection 1/i)).toBeInTheDocument();
    expect(getByText(/Subsection_1 Unit 1/i)).toBeInTheDocument();
    expect(getByText(/Subsection 2/i)).toBeInTheDocument();
    expect(getByText(/Subsection_2 Unit 1/i)).toBeInTheDocument();
    expect(queryByText(/Subsection 3/i)).not.toBeInTheDocument();
    expect(getByRole('button', { name: messages.cancelButton.defaultMessage })).toBeInTheDocument();
    expect(getByRole('button', { name: messages.publishButton.defaultMessage })).toBeInTheDocument();
  });

  it('calls the onClose function when the cancel button is clicked', () => {
    const { getByRole } = renderComponent();

    const cancelButton = getByRole('button', { name: messages.cancelButton.defaultMessage });
    fireEvent.click(cancelButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls the onPublishSubmit function when save button is clicked', async () => {
    const { getByRole } = renderComponent();

    const publishButton = getByRole('button', { name: messages.publishButton.defaultMessage });
    fireEvent.click(publishButton);
    expect(onPublishSubmitMock).toHaveBeenCalledTimes(1);
  });
});
