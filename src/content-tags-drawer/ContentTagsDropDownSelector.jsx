// @ts-check
import React, { useState, useCallback } from 'react';
import {
  SelectableBox,
  Icon,
  Spinner,
  Button,
} from '@edx/paragon';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import { ArrowDropDown, ArrowDropUp } from '@edx/paragon/icons';
import PropTypes from 'prop-types';
import messages from './messages';
import './ContentTagsDropDownSelector.scss';

import { useTaxonomyTagsData } from './data/apiHooks';

const ContentTagsDropDownSelector = ({
  taxonomyId, level, lineage, tagsTree, searchTerm,
}) => {
  const intl = useIntl();

  // This object represents the states of the dropdowns on this level
  // The keys represent the index of the dropdown with
  // the value true (open) false (closed)
  const [dropdownStates, setDropdownStates] = useState({});
  const isOpen = (tagValue) => dropdownStates[tagValue];

  const [numPages, setNumPages] = useState(1);
  const parentTagValue = lineage.length ? decodeURIComponent(lineage[lineage.length - 1]) : null;
  const { hasMorePages, tagPages } = useTaxonomyTagsData(taxonomyId, parentTagValue, numPages, searchTerm);

  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);

  // Reset the page and tags state when search term changes
  // and store search term to compare
  if (prevSearchTerm !== searchTerm) {
    setPrevSearchTerm(searchTerm);
    setNumPages(1);
  }

  const clickAndEnterHandler = (tagValue) => {
    // This flips the state of the dropdown at index false (closed) -> true (open)
    // and vice versa. Initially they are undefined which is falsy.
    setDropdownStates({ ...dropdownStates, [tagValue]: !dropdownStates[tagValue] });
  };

  const isImplicit = (tag) => {
    // Traverse the tags tree using the lineage
    let traversal = tagsTree;
    lineage.forEach(t => {
      // We need to decode the tag to traverse the tree since the lineage value is encoded
      traversal = traversal[t]?.children || {};
    });

    return (traversal[tag.value] && !traversal[tag.value].explicit) || false;
  };

  const loadMoreTags = useCallback(() => {
    setNumPages((x) => x + 1);
  }, []);

  return (
    <div style={{ marginLeft: `${level * 1 }rem` }}>
      {tagPages.map((tagPage, pageNum) => (
        // Array index represents the page number
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={`tag-page-${pageNum}`}>
          {tagPage.isLoading ? (
            <div className="d-flex justify-content-center align-items-center flex-row">
              <Spinner
                animation="border"
                size="xl"
                screenReaderText={intl.formatMessage(messages.loadingTagsDropdownMessage)}
              />
            </div>
          ) : null }
          {tagPage.isError ? 'Error...' : null /* TODO: show a proper error message */}

          {tagPage.data?.map((tagData) => (
            <React.Fragment key={tagData.value}>
              <div
                className="d-flex flex-row"
                style={{
                  minHeight: '44px',
                }}
              >
                <div className="d-flex">
                  <SelectableBox
                    inputHidden={false}
                    type="checkbox"
                    className="d-flex align-items-center taxonomy-tags-selectable-box"
                    aria-label={`${tagData.value} checkbox`}
                    data-selectable-box="taxonomy-tags"
                    value={[...lineage, tagData.value].map(t => encodeURIComponent(t)).join(',')}
                    isIndeterminate={isImplicit(tagData)}
                    disabled={isImplicit(tagData)}
                  >
                    {tagData.value}
                  </SelectableBox>
                  { tagData.childCount > 0
                    && (
                      <div className="d-flex align-items-center taxonomy-tags-arrow-drop-down">
                        <Icon
                          src={isOpen(tagData.value) ? ArrowDropUp : ArrowDropDown}
                          onClick={() => clickAndEnterHandler(tagData.value)}
                          tabIndex="0"
                          onKeyPress={(event) => (event.key === 'Enter' ? clickAndEnterHandler(tagData.value) : null)}
                        />
                      </div>
                    )}
                </div>

              </div>

              { tagData.childCount > 0 && isOpen(tagData.value) && (
                <ContentTagsDropDownSelector
                  taxonomyId={taxonomyId}
                  level={level + 1}
                  lineage={[...lineage, tagData.value]}
                  tagsTree={tagsTree}
                  searchTerm={searchTerm}
                />
              )}

            </React.Fragment>
          ))}

        </React.Fragment>
      ))}

      { hasMorePages
        ? (
          <div className="d-flex justify-content-center align-items-center flex-row">
            <Button
              variant="outline-primary"
              onClick={loadMoreTags}
              className="mb-2 taxonomy-tags-load-more-button"
            >
              <FormattedMessage {...messages.loadMoreTagsButtonText} />
            </Button>
          </div>
        )
        : null}

    </div>
  );
};

ContentTagsDropDownSelector.defaultProps = {
  lineage: [],
  searchTerm: null,
};

ContentTagsDropDownSelector.propTypes = {
  taxonomyId: PropTypes.number.isRequired,
  level: PropTypes.number.isRequired,
  lineage: PropTypes.arrayOf(PropTypes.string),
  tagsTree: PropTypes.objectOf(
    PropTypes.shape({
      explicit: PropTypes.bool.isRequired,
      children: PropTypes.shape({}).isRequired,
    }).isRequired,
  ).isRequired,
  searchTerm: PropTypes.string,
};

export default ContentTagsDropDownSelector;
