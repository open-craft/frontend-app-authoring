// ts-check
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  useToggle,
  Button,
  Dropdown,
  Icon,
  IconButton,
} from '@edx/paragon';
import { MoreVert } from '@edx/paragon/icons';
import PropTypes from 'prop-types';

import ExportModal from '../export-modal';
import { importTaxonomyTags } from '../import-tags';
import messages from './messages';

const TaxonomyMenu = ({
  id, name, iconMenu, disabled,
}) => {
  const intl = useIntl();

  const [isExportModalOpen, exportModalOpen, exportModalClose] = useToggle(false);

  const menuItemActions = {
    import: () => importTaxonomyTags(id, intl),
    export: exportModalOpen,
  };

  const onClickMenuItem = (e, menuName) => {
    e.preventDefault();
    menuItemActions[menuName]?.();
  };

  const renderModals = () => isExportModalOpen && (
    <ExportModal
      isOpen={isExportModalOpen}
      onClose={exportModalClose}
      taxonomyId={id}
      taxonomyName={name}
    />
  );

  return (
    <Dropdown onToggle={(isOpen, ev) => ev.preventDefault()}>
      <Dropdown.Toggle
        as={iconMenu ? IconButton : Button}
        src={MoreVert}
        iconAs={Icon}
        variant="primary"
        alt={intl.formatMessage(messages.actionsButtonAlt, { name })}
        data-testid="taxonomy-menu-button"
        disabled={disabled}
      >
        {intl.formatMessage(messages.actionsButtonLabel)}
      </Dropdown.Toggle>
      <Dropdown.Menu data-testid="taxonomy-menu">
        <Dropdown.Item data-testid="taxonomy-menu-import" onClick={(e) => onClickMenuItem(e, 'import')}>
          {intl.formatMessage(messages.importMenu)}
        </Dropdown.Item>
        <Dropdown.Item data-testid="taxonomy-menu-export" onClick={(e) => onClickMenuItem(e, 'export')}>
          {intl.formatMessage(messages.exportMenu)}
        </Dropdown.Item>
      </Dropdown.Menu>
      {renderModals()}
    </Dropdown>
  );
};

TaxonomyMenu.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  iconMenu: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
};

TaxonomyMenu.defaultProps = {
  disabled: false,
};

export default TaxonomyMenu;
