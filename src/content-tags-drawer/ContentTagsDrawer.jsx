// @ts-check
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Spinner,
  Stack,
  Button,
  Toast,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useParams } from 'react-router-dom';
import messages from './messages';
import ContentTagsCollapsible from './ContentTagsCollapsible';
import Loading from '../generic/Loading';
import useContentTagsDrawerHelper from './ContentTagsDrawerHelper';

/** @typedef {import("../taxonomy/data/types.mjs").TaxonomyData} TaxonomyData */

/**
 * Drawer with the functionality to show and manage tags in a certain content.
 * It is used both in interfaces of this MFE and in edx-platform interfaces such as iframe.
 * - If you want to use it as an iframe, the component obtains the `contentId` from the url parameters.
 *   Functions to close the drawer are handled internally.
 *   TODO: We can delete this method when is no longer used on edx-platform.
 * - If you want to use it as react component, you need to pass the content id and the close functions
 *   through the component parameters.
 */
const ContentTagsDrawer = ({ id, onClose }) => {
  const intl = useIntl();
  // TODO: We can delete 'params' when the iframe is no longer used on edx-platform
  const params = useParams();
  const contentId = id ?? params.contentId;

  const {
    stagedContentTags,
    addStagedContentTag,
    removeStagedContentTag,
    removeGlobalStagedContentTag,
    addRemovedContentTag,
    deleteRemovedContentTag,
    setStagedTags,
    globalStagedContentTags,
    globalStagedRemovedContentTags,
    setGlobalStagedContentTags,
    commitGlobalStagedTagsStatus,
    commitGlobalStagedTags,
    isContentDataLoaded,
    isContentTaxonomyTagsLoaded,
    isTaxonomyListLoaded,
    contentName,
    tagsByTaxonomy,
    isEditMode,
    toEditMode,
    toReadMode,
    collapsibleStates,
    openCollapsible,
    closeCollapsible,
    toastMessage,
    showToastAfterSave,
    closeToast,
  } = useContentTagsDrawerHelper(contentId);

  let onCloseDrawer = onClose;
  if (onCloseDrawer === undefined) {
    onCloseDrawer = () => {
      // "*" allows communication with any origin
      window.parent.postMessage('closeManageTagsDrawer', '*');
    };
  }

  useEffect(() => {
    const handleEsc = (event) => {
      /* Close drawer when ESC-key is pressed and selectable dropdown box not open */
      const selectableBoxOpen = document.querySelector('[data-selectable-box="taxonomy-tags"]');
      if (event.key === 'Escape' && !selectableBoxOpen) {
        onCloseDrawer();
      }
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (commitGlobalStagedTagsStatus === 'success') {
      showToastAfterSave();
      toReadMode();
    }
  }, [commitGlobalStagedTagsStatus]);

  return (
    <div id="content-tags-drawer" className="tags-drawer d-flex flex-column justify-content-between">
      <Container size="xl" className="pt-4 pr-4 pl-4">
        { isContentDataLoaded
          ? <h2>{ contentName }</h2>
          : (
            <div className="d-flex justify-content-center align-items-center flex-column">
              <Spinner
                animation="border"
                size="xl"
                screenReaderText={intl.formatMessage(messages.loadingMessage)}
              />
            </div>
          )}

        <hr />
        <p className="lead text-gray-500 font-weight-bold">{intl.formatMessage(messages.headerSubtitle)}</p>

        { isTaxonomyListLoaded && isContentTaxonomyTagsLoaded
          ? tagsByTaxonomy.map((data) => (
            <div key={`taxonomy-tags-collapsible-${data.id}`}>
              <ContentTagsCollapsible
                contentId={contentId}
                taxonomyAndTagsData={data}
                stagedContentTags={stagedContentTags[data.id] || []}
                addStagedContentTag={addStagedContentTag}
                removeStagedContentTag={removeStagedContentTag}
                removeGlobalStagedContentTag={removeGlobalStagedContentTag}
                addRemovedContentTag={addRemovedContentTag}
                deleteRemovedContentTag={deleteRemovedContentTag}
                setStagedTags={setStagedTags}
                globalStagedContentTags={globalStagedContentTags}
                globalStagedRemovedContentTags={globalStagedRemovedContentTags}
                setGlobalStagedContentTags={setGlobalStagedContentTags}
                isEditMode={isEditMode}
                collapsibleState={collapsibleStates[data.id] || false}
                openCollapsible={openCollapsible}
                closeCollapsible={closeCollapsible}
              />
              <hr />
            </div>
          ))
          : <Loading />}
      </Container>

      { isTaxonomyListLoaded && isContentTaxonomyTagsLoaded && (
        <Container
          className="bg-white position-sticky p-3.5 tags-drawer-footer"
        >
          <div className="d-flex justify-content-end">
            { commitGlobalStagedTagsStatus !== 'loading' ? (
              <Stack direction="horizontal" gap={2}>
                <Button
                  className="font-weight-bold tags-drawer-cancel-button"
                  variant="tertiary"
                  onClick={isEditMode
                    ? toReadMode
                    : onCloseDrawer}
                >
                  { intl.formatMessage(isEditMode
                    ? messages.tagsDrawerCancelButtonText
                    : messages.tagsDrawerCloseButtonText)}
                </Button>
                <Button
                  variant="dark"
                  className="rounded-0"
                  onClick={isEditMode
                    ? commitGlobalStagedTags
                    : toEditMode}
                >
                  { intl.formatMessage(isEditMode
                    ? messages.tagsDrawerSaveButtonText
                    : messages.tagsDrawerEditTagsButtonText)}
                </Button>
              </Stack>
            )
              : (
                <Spinner
                  animation="border"
                  size="xl"
                  screenReaderText={intl.formatMessage(messages.loadingMessage)}
                />
              )}
          </div>
        </Container>
      )}
      {toastMessage && (
        <Toast
          show
          onClose={closeToast}
        >
          {toastMessage}
        </Toast>
      )}
    </div>
  );
};

ContentTagsDrawer.propTypes = {
  id: PropTypes.string,
  onClose: PropTypes.func,
};

ContentTagsDrawer.defaultProps = {
  id: undefined,
  onClose: undefined,
};

export default ContentTagsDrawer;
