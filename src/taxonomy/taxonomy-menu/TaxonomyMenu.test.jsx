import { IntlProvider } from '@edx/frontend-platform/i18n';
import { initializeMockApp } from '@edx/frontend-platform';
import { AppProvider } from '@edx/frontend-platform/react';
import { render, fireEvent } from '@testing-library/react';
import PropTypes from 'prop-types';

import initializeStore from '../../store';
import { getTaxonomyExportFile } from '../data/api';
import { importTaxonomyTags } from '../import-tags';
import { TaxonomyMenu } from '.';

let store;
const taxonomyId = 1;
const taxonomyName = 'Taxonomy 1';

jest.mock('../import-tags', () => ({
  importTaxonomyTags: jest.fn().mockResolvedValue({}),
}));

jest.mock('../data/api', () => ({
  getTaxonomyExportFile: jest.fn(),
}));

const TaxonomyMenuComponent = ({
  iconMenu,
  disabled,
}) => (
  <AppProvider store={store}>
    <IntlProvider locale="en" messages={{}}>
      <TaxonomyMenu id={taxonomyId} name={taxonomyName} iconMenu={iconMenu} disabled={disabled} />
    </IntlProvider>
  </AppProvider>
);

TaxonomyMenuComponent.propTypes = {
  iconMenu: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
};

TaxonomyMenuComponent.defaultProps = {
  disabled: false,
};

describe('<TaxonomyMenu />', async () => {
  beforeEach(async () => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });
    store = initializeStore();
  });

  [true, false].forEach((iconMenu) => {
    test('should open and close menu on button click', () => {
      const { getByTestId } = render(<TaxonomyMenuComponent iconMenu={iconMenu} />);

      // Menu closed/doesn't exist yet
      expect(() => getByTestId('taxonomy-menu')).toThrow();

      // Click on the menu button to open
      fireEvent.click(getByTestId('taxonomy-menu-button'));

      // Menu opened
      expect(getByTestId('taxonomy-menu')).toBeVisible();

      // Click on button again to close the menu
      fireEvent.click(getByTestId('taxonomy-menu-button'));

      // Menu closed
      // Jest bug: toBeVisible() isn't checking opacity correctly
      // expect(getByTestId('taxonomy-menu')).not.toBeVisible();
      expect(getByTestId('taxonomy-menu').style.opacity).toEqual('0');

      // Menu button still visible
      expect(getByTestId('taxonomy-menu-button')).toBeVisible();
    });

    test('should open export modal on export menu click', () => {
      const { getByTestId, getByText } = render(<TaxonomyMenuComponent iconMenu={iconMenu} />);

      // Modal closed
      expect(() => getByText('Select format to export')).toThrow();

      // Click on export menu
      fireEvent.click(getByTestId('taxonomy-menu-button'));
      fireEvent.click(getByTestId('taxonomy-menu-export'));

      // Modal opened
      expect(getByText('Select format to export')).toBeInTheDocument();

      // Click on cancel button
      fireEvent.click(getByText('Cancel'));

      // Modal closed
      expect(() => getByText('Select format to export')).toThrow();
    });

    test('should call import tags when menu click', () => {
      const { getByTestId } = render(<TaxonomyMenuComponent iconMenu={iconMenu} />);

      // Click on import menu
      fireEvent.click(getByTestId('taxonomy-menu-button'));
      fireEvent.click(getByTestId('taxonomy-menu-import'));

      expect(importTaxonomyTags).toHaveBeenCalled();
    });

    test('should export a taxonomy', () => {
      const { getByTestId, getByText } = render(<TaxonomyMenuComponent iconMenu={iconMenu} />);

      // Click on export menu
      fireEvent.click(getByTestId('taxonomy-menu-button'));
      fireEvent.click(getByTestId('taxonomy-menu-export'));

      // Select JSON format and click on export
      fireEvent.click(getByText('JSON file'));
      fireEvent.click(getByTestId('export-button-1'));

      // Modal closed
      expect(() => getByText('Select format to export')).toThrow();
      expect(getTaxonomyExportFile).toHaveBeenCalledWith(taxonomyId, 'json');
    });
  });
});
