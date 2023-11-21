import React from 'react';
import PropTypes from 'prop-types';

import TagBubble from './TagBubble';

/**
 * Component that renders Tags under a Taxonomy in the nested tree format.
 *
 * Example:
 *
 * {
 *   "Science and Research": {
 *     explicit: false,
 *     children: {
 *       "Genetics Subcategory": {
 *         explicit: false,
 *         children: {
 *           "DNA Sequencing": {
 *             explicit: true,
 *             children: {}
 *           }
 *         }
 *       },
 *       "Molecular, Cellular, and Microbiology": {
 *         explicit: false,
 *         children: {
 *           "Virology": {
 *             explicit: true,
 *             children: {}
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * @param {Object} tagsTree - Array of taxonomy tags that are applied to the content
 */
const ContentTagsTree = ({ tagsTree }) => {
  const renderTagsTree = (tag, level) => Object.keys(tag).map((key) => {
    if (tag[key] !== undefined) {
      return (
        <div key={`tag-${key}-level-${level}`}>
          <TagBubble
            key={`tag-${key}`}
            value={key}
            implicit={!tag[key].explicit}
            level={level}
          />
          { renderTagsTree(tag[key].children, level + 1) }
        </div>
      );
    }
    return null;
  });

  return renderTagsTree(tagsTree, 0);
};

ContentTagsTree.propTypes = {
  tagsTree: PropTypes.objectOf(
    PropTypes.shape({
      explicit: PropTypes.bool.isRequired,
      children: PropTypes.objectOf().isRequired,
    }).isRequired,
  ).isRequired,
};

export default ContentTagsTree;
