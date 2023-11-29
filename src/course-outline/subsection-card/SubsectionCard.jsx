import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge, Button, useToggle } from '@edx/paragon';
import { Add as IconAdd } from '@edx/paragon/icons';

import { setCurrentItem } from '../data/slice';
import { RequestStatus } from '../../data/constants';
import CardHeader from '../card-header/CardHeader';
import { getItemStatus } from '../utils';
import messages from './messages';

const SubsectionCard = ({
  subsection,
  children,
  onOpenHighlightsModal,
  onOpenPublishModal,
  onEditSectionSubmit,
  savingStatus,
  onOpenDeleteModal,
  onDuplicateSubmit,
}) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, openForm, closeForm] = useToggle(false);

  const {
    id,
    displayName,
    hasChanges,
    published,
    releasedToStudents,
    visibleToStaffOnly = false,
    visibilityState,
    staffOnlyMessage,
  } = subsection;

  const subsectionStatus = getItemStatus({
    published,
    releasedToStudents,
    visibleToStaffOnly,
    visibilityState,
    staffOnlyMessage,
  });

  const handleExpandContent = () => {
    setIsExpanded((prevState) => !prevState);
  };

  const handleClickMenuButton = () => {
    dispatch(setCurrentItem(subsection));
  };

  const handleEditSubmit = (titleValue) => {
    if (displayName !== titleValue) {
      onEditSectionSubmit(id, titleValue);
      return;
    }

    closeForm();
  };

  const handleOpenHighlightsModal = () => {
    onOpenHighlightsModal(subsection);
  };

  useEffect(() => {
    if (savingStatus === RequestStatus.SUCCESSFUL) {
      closeForm();
    }
  }, [savingStatus]);

  return (
    <div className="subsection-card" data-testid="subsection-card">
      <CardHeader
        title={displayName}
        status={subsectionStatus}
        hasChanges={hasChanges}
        isExpanded={isExpanded}
        onExpand={handleExpandContent}
        onClickMenuButton={handleClickMenuButton}
        onClickPublish={onOpenPublishModal}
        onClickEdit={openForm}
        onClickDelete={onOpenDeleteModal}
        isFormOpen={isFormOpen}
        closeForm={closeForm}
        onEditSubmit={handleEditSubmit}
        isDisabledEditField={savingStatus === RequestStatus.IN_PROGRESS}
        onClickDuplicate={onDuplicateSubmit}
        namePrefix={'subsection'}
      />
      {isExpanded && (
        <React.Fragment>
          <div data-testid="subsection-card__units" className="subsection-card__units">
            {children}
          </div>
          <Button
            data-testid="new-unit-button"
            className="mt-4"
            variant="outline-primary"
            iconBefore={IconAdd}
            block
          >
            {intl.formatMessage(messages.newUnitButton)}
          </Button>
        </React.Fragment>
      )}
    </div>
  );
};

SubsectionCard.defaultProps = {
  children: null,
};

SubsectionCard.propTypes = {
  subsection: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    published: PropTypes.bool.isRequired,
    hasChanges: PropTypes.bool.isRequired,
    releasedToStudents: PropTypes.bool.isRequired,
    visibleToStaffOnly: PropTypes.bool,
    visibilityState: PropTypes.string.isRequired,
    staffOnlyMessage: PropTypes.bool.isRequired,
  }).isRequired,
  children: PropTypes.node,
  onOpenHighlightsModal: PropTypes.func.isRequired,
  onOpenPublishModal: PropTypes.func.isRequired,
  onEditSectionSubmit: PropTypes.func.isRequired,
  savingStatus: PropTypes.string.isRequired,
  onOpenDeleteModal: PropTypes.func.isRequired,
  onDuplicateSubmit: PropTypes.func.isRequired,
};

export default SubsectionCard;
