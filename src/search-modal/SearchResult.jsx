/* eslint-disable react/prop-types */
// @ts-check
import React from 'react';
import { getConfig, getPath } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Icon,
  IconButton,
  Stack,
} from '@openedx/paragon';
import { OpenInNew } from '@openedx/paragon/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { constructLibraryAuthoringURL } from '../utils';
import { getStudioHomeData } from '../studio-home/data/selectors';
import { useSearchContext } from './manager/SearchManager';
import Highlight from './Highlight';
import messages from './messages';
import { getItemIcon } from '../generic/block-type-utils';

/**
 * Returns the URL Suffix for library/library component hit
 * @param {import('./data/api').ContentHit} hit
 * @returns string
*/
function getLibraryComponentUrlSuffix(hit) {
  const { contextKey } = hit;
  return `library/${contextKey}`;
}

/**
 * Returns the URL Suffix for a unit hit
 * @param {import('./data/api').ContentHit} hit
 * @returns string
*/
function getUnitUrlSuffix(hit) {
  const { contextKey, usageKey } = hit;
  return `course/${contextKey}/container/${usageKey}`;
}

/**
 * Returns the URL Suffix for a unit component hit
 * @param {import('./data/api').ContentHit} hit
 * @returns string
*/
function getUnitComponentUrlSuffix(hit) {
  const { breadcrumbs, contextKey, usageKey } = hit;
  if (breadcrumbs.length > 1) {
    let parent = breadcrumbs[breadcrumbs.length - 1];

    if ('usageKey' in parent) {
      // Handle case for library component in unit
      let libComponentUsageKey;
      if (parent.usageKey.includes('type@library_content') && breadcrumbs.length > 2) {
        libComponentUsageKey = parent.usageKey;
        parent = breadcrumbs[breadcrumbs.length - 2];
      }

      if ('usageKey' in parent) {
        const encodedUsageKey = encodeURIComponent(libComponentUsageKey || usageKey);
        return `course/${contextKey}/container/${parent.usageKey}?show=${encodedUsageKey}`;
      }
    }
  }

  // istanbul ignore next - This case should never be reached
  return `course/${contextKey}`;
}

/**
 * Returns the URL Suffix for a course component hit
 * @param {import('./data/api').ContentHit} hit
 * @returns string
*/
function getCourseComponentUrlSuffix(hit) {
  const { contextKey, usageKey } = hit;
  return `course/${contextKey}?show=${encodeURIComponent(usageKey)}`;
}

/**
 * Returns the URL Suffix for the search hit param
 * @param {import('./data/api').ContentHit} hit
 * @returns string
*/
function getUrlSuffix(hit) {
  const { blockType, breadcrumbs } = hit;

  // Check if is a unit
  if (blockType === 'vertical') {
    return getUnitUrlSuffix(hit);
  }

  // Check if the parent is a unit or a library component in a unit
  if (breadcrumbs.length > 1) {
    const parent = breadcrumbs[breadcrumbs.length - 1];

    if ('usageKey' in parent && (
      parent.usageKey.includes('type@vertical') || parent.usageKey.includes('type@library_content'))
    ) {
      return getUnitComponentUrlSuffix(hit);
    }
  }

  return getCourseComponentUrlSuffix(hit);
}

/**
 * A single search result (row), usually represents an XBlock/Component
 * @type {React.FC<{hit: import('./data/api').ContentHit}>}
 */
const SearchResult = ({ hit }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { closeSearchModal } = useSearchContext();
  const { libraryAuthoringMfeUrl, redirectToLibraryAuthoringMfe } = useSelector(getStudioHomeData);

  /**
   * Returns the URL for the context of the hit
   */
  const getContextUrl = React.useCallback((newWindow = false) => {
    const { contextKey } = hit;

    if (contextKey.startsWith('course-v1:')) {
      const urlSuffix = getUrlSuffix(hit);

      if (newWindow) {
        return `${getPath(getConfig().PUBLIC_PATH)}${urlSuffix}`;
      }
      return `/${urlSuffix}`;
    }

    if (contextKey.startsWith('lib:')) {
      const urlSuffix = getLibraryComponentUrlSuffix(hit);
      if (redirectToLibraryAuthoringMfe && libraryAuthoringMfeUrl) {
        return constructLibraryAuthoringURL(libraryAuthoringMfeUrl, urlSuffix);
      }

      if (newWindow) {
        return `${getPath(getConfig().PUBLIC_PATH)}${urlSuffix}`;
      }
      return `/${urlSuffix}`;
    }

    // istanbul ignore next - This case should never be reached
    return undefined;
  }, [libraryAuthoringMfeUrl, redirectToLibraryAuthoringMfe, hit]);

  /**
   * Opens the context of the hit in a new window
   * @param {React.MouseEvent} e
   * @returns {void}
   */
  const openContextInNewWindow = (e) => {
    e.stopPropagation();
    const newWindowUrl = getContextUrl(true);
    /* istanbul ignore next */
    if (!newWindowUrl) {
      return;
    }
    window.open(newWindowUrl, '_blank');
  };

  /**
   * Navigates to the context of the hit
   * @param {(React.MouseEvent | React.KeyboardEvent)} e
   * @returns {void}
   */
  const navigateToContext = React.useCallback((e) => {
    e.stopPropagation();
    const redirectUrl = getContextUrl();

    /* istanbul ignore next */
    if (!redirectUrl) {
      // This case is for the library authoring MFE
      return;
    }

    if ('key' in e && e.key !== 'Enter' && e.key !== ' ') {
      return;
    }

    /* istanbul ignore next */
    if (redirectUrl.startsWith('http')) {
      // This case is for the library authoring MFE
      window.location.href = redirectUrl;
      return;
    }

    navigate(redirectUrl);
    closeSearchModal();
  }, [getContextUrl]);

  return (
    <Stack
      className="border-bottom search-result p-2 align-items-start"
      direction="horizontal"
      gap={3}
      onClick={navigateToContext}
      onKeyDown={navigateToContext}
      tabIndex={0}
      role="button"
    >
      <Icon className="text-muted" src={getItemIcon(hit.blockType)} />
      <Stack>
        <div className="hit-name small">
          <Highlight text={hit.formatted.displayName} />
        </div>
        <div className="hit-description x-small text-truncate">
          <Highlight text={hit.formatted.content?.htmlContent ?? ''} />
          <Highlight text={hit.formatted.content?.capaContent ?? ''} />
        </div>
        <div className="text-muted x-small">
          {hit.breadcrumbs.map(bc => bc.displayName).join(' / ')}
        </div>
      </Stack>
      <IconButton
        src={OpenInNew}
        iconAs={Icon}
        onClick={openContextInNewWindow}
        alt={intl.formatMessage(messages.openInNewWindow)}
      />
    </Stack>
  );
};

export default SearchResult;
