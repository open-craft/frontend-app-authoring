// @ts-check
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  CloseButton,
  Spinner,
  Stack,
  Button,
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
    isContentDataLoaded,
    isContentTaxonomyTagsLoaded,
    isTaxonomyListLoaded,
    contentName,
    tagsByTaxonomy,
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

  return (
    <div id="content-tags-drawer" className="mt-1 tags-drawer">
      <Container size="xl">
        <CloseButton onClick={() => onCloseDrawer()} data-testid="drawer-close-button" />
        <span>{intl.formatMessage(messages.headerSubtitle)}</span>
        { isContentDataLoaded
          ? <h3>{ contentName }</h3>
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
              />
              <hr />
            </div>
          ))
          : <Loading />}
      </Container>

      { isTaxonomyListLoaded && isContentTaxonomyTagsLoaded && (
        <Container
          className="bg-white position-absolute p-3.5 tags-drawer-footer"
        >
          <div className="d-flex justify-content-end">
            <Stack direction="horizontal" gap={2}>
              <Button
                className="font-weight-bold tags-drawer-cancel-button"
                variant="tertiary"
                onClick={onCloseDrawer}
              >
                { intl.formatMessage(messages.tagsDrawerCancelButtonText) }
              </Button>
              <Button
                variant="dark"
                className="rounded-0"
              >
                { intl.formatMessage(messages.tagsDrawerSaveButtonText)}
              </Button>
            </Stack>
          </div>
        </Container>
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
