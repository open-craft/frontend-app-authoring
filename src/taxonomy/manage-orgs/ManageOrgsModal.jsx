// @ts-check
import React, { useEffect, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  useToggle,
  ActionRow,
  AlertModal,
  Button,
  Chip,
  Container,
  Form,
  ModalDialog,
  Stack,
} from '@edx/paragon';
import {
  Close,
  Warning,
} from '@edx/paragon/icons';
import PropTypes from 'prop-types';

import { useOrganizationListData } from '../../generic/data/apiHooks';
import { useTaxonomyDetailDataResponse } from '../data/apiHooks';
import { useManageOrgs } from './data/api';
import messages from './messages';
import './ManageOrgsModal.scss';

const ConfirmModal = ({
  isOpen,
  close,
  confirm,
  taxonomyName,
}) => {
  const intl = useIntl();
  return (
    <AlertModal
      title={intl.formatMessage(messages.confirmUnassignTitle)}
      isOpen={isOpen}
      onClose={close}
      variant="warning"
      icon={Warning}
      footerNode={(
        <ActionRow>
          <Button variant="tertiary" onClick={close}>
            {intl.formatMessage(messages.cancelButton)}
          </Button>
          <Button variant="primary" onClick={confirm}>
            {intl.formatMessage(messages.continueButton)}
          </Button>
        </ActionRow>
      )}
    >
      <p>
        {intl.formatMessage(messages.confirmUnassignText, { taxonomyName })}
      </p>
    </AlertModal>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  confirm: PropTypes.func.isRequired,
  taxonomyName: PropTypes.string.isRequired,
};

const ManageOrgsModal = ({
  taxonomyId,
  isOpen,
  onClose,
}) => {
  const intl = useIntl();
  const [selectedOrgs, setSelectedOrgs] = useState(/** @type {null|string[]} */(null));
  const [allOrgs, setAllOrgs] = useState(/** @type {null|boolean} */(null));

  const [isConfirmModalOpen, openConfirmModal, closeConfirmModal] = useToggle(false);

  const {
    data: organizationListData,
  } = useOrganizationListData();

  const taxonomy = useTaxonomyDetailDataResponse(taxonomyId);

  const manageOrgMutation = useManageOrgs();

  const saveOrgs = async () => {
    closeConfirmModal();
    if (selectedOrgs !== null && allOrgs !== null) {
      try {
        await manageOrgMutation.mutateAsync({
          taxonomyId,
          orgs: selectedOrgs,
          allOrgs,
        });
        // ToDo: display a success message to the user
      } catch (/** @type {any} */ error) {
        // ToDo: display the error to the user
      } finally {
        onClose();
      }
    }
  };

  const confirmSave = async () => {
    if (!selectedOrgs?.length && !allOrgs) {
      openConfirmModal();
    } else {
      await saveOrgs();
    }
  };

  useEffect(() => {
    if (taxonomy) {
      if (selectedOrgs === null) {
        setSelectedOrgs([...taxonomy.orgs]);
      }
      if (allOrgs === null) {
        setAllOrgs(taxonomy.allOrgs);
      }
    }
  }, [taxonomy]);

  useEffect(() => {
    if (selectedOrgs) {
      // This is a hack to force the Form.Autosuggest to clear its value after a selection is made.
      const inputRef = /** @type {null|HTMLInputElement} */ (document.querySelector('.pgn__form-group input'));
      if (inputRef) {
        //  @ts-ignore
        inputRef.value = null;
        const event = new Event('change', { bubbles: true });
        inputRef.dispatchEvent(event);
      }
    }
  }, [selectedOrgs]);

  if (!selectedOrgs || !taxonomy) {
    return null;
  }

  return (
    <Container onClick={(e) => e.stopPropagation() /* This prevents calling onClick handler from the parent */}>
      <ModalDialog
        className="manage-orgs"
        title={intl.formatMessage(messages.headerTitle)}
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        hasCloseButton
        isFullscreenOnMobile
      >
        <ModalDialog.Header>
          <ModalDialog.Title>
            {intl.formatMessage(messages.headerTitle)}
          </ModalDialog.Title>
        </ModalDialog.Header>

        <hr className="mx-4" />

        <ModalDialog.Body>
          <Form.Label>
            <Stack>
              <div>{intl.formatMessage(messages.bodyText)}</div>
              <div>{intl.formatMessage(messages.currentAssignments)}</div>
              <div className="col-9 d-inline-box overflow-auto">
                {selectedOrgs.length ? selectedOrgs.map((org) => (
                  <Chip
                    key={org}
                    iconAfter={Close}
                    onIconAfterClick={() => setSelectedOrgs(selectedOrgs.filter((o) => o !== org))}
                    disabled={allOrgs}
                  >
                    {org}
                  </Chip>
                )) : <span className="text-muted">{intl.formatMessage(messages.noOrganizationAssigned)}</span> }
              </div>
            </Stack>
          </Form.Label>
          <Form.Group>
            <Form.Label>
              {intl.formatMessage(messages.addOrganizations)}
            </Form.Label>
            <Form.Autosuggest
              loading={!organizationListData}
              placeholder={intl.formatMessage(messages.searchOrganizations)}
              onSelected={(org) => setSelectedOrgs([...selectedOrgs, org])}
              disabled={allOrgs}
            >
              {organizationListData && organizationListData.filter(o => !selectedOrgs?.includes(o)).map((org) => (
                <Form.AutosuggestOption key={org}>{org}</Form.AutosuggestOption>
              ))}
            </Form.Autosuggest>
          </Form.Group>
          <Form.Checkbox checked={allOrgs} onChange={(e) => setAllOrgs(e.target.checked)}>
            {intl.formatMessage(messages.assignAll)}
          </Form.Checkbox>
        </ModalDialog.Body>

        <hr className="mx-4" />

        <ModalDialog.Footer>
          <ActionRow>
            <ModalDialog.CloseButton variant="tertiary">
              {intl.formatMessage(messages.cancelButton)}
            </ModalDialog.CloseButton>
            <Button
              variant="primary"
              onClick={confirmSave}
              data-testid="save-button"
            >
              {intl.formatMessage(messages.saveButton)}
            </Button>
          </ActionRow>
        </ModalDialog.Footer>
      </ModalDialog>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        close={closeConfirmModal}
        confirm={saveOrgs}
        taxonomyName={taxonomy.name}
      />
    </Container>
  );
};

ManageOrgsModal.propTypes = {
  taxonomyId: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ManageOrgsModal;
