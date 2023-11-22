import React from 'react';
import {
  Badge,
  Collapsible,
  SelectableBox,
  Button,
  ModalPopup,
  useToggle,
  useCheckboxSetValues,
} from '@edx/paragon';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import messages from './messages';
import './ContentTagsCollapsible.scss';

import ContentTagsDropDownSelector from './ContentTagsDropDownSelector';

import ContentTagsTree from './ContentTagsTree';

import { useContentTaxonomyTagsMutation } from './data/apiHooks';

/**
 * Collapsible component that holds a Taxonomy along with Tags that belong to it.
 * This includes both applied tags and tags that are available to select
 * from a dropdown list.
 *
 * This component also handles all the logic with selecting/deselecting tags and keeps track of the
 * tags tree in the state. That is used to render the Tag bubbgles as well as the populating the
 * state of the tags in the dropdown selectors.
 *
 * The `contentTags` that is passed are consolidated and converted to a tree structure. For example:
 *
 * FROM:
 *
 * [
 *   {
 *     "value": "DNA Sequencing",
 *     "lineage": [
 *       "Science and Research",
 *       "Genetics Subcategory",
 *       "DNA Sequencing"
 *     ]
 *   },
 *   {
 *     "value": "Virology",
 *     "lineage": [
 *       "Science and Research",
 *       "Molecular, Cellular, and Microbiology",
 *       "Virology"
 *     ]
 *   }
 * ]
 *
 * TO:
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
 *
 * It also keeps track of newly added tags as they are selected in the dropdown selectors.
 * They are store in the same format above, and then merged to one tree that is used as the
 * source of truth for both the tag bubble and the dropdowns. They keys are order alphabetically.
 *
 * In the dropdowns, the value of each SelectableBox is stored along with it's lineage and is URI encoded.
 * Ths is so we are able to traverse and manipulate different parts of the tree leading to it.
 * Here is an example of what the value of the "Virology" tag would be:
 *
 *  "Science%20and%20Research,Molecular%2C%20Cellular%2C%20and%20Microbiology,Virology"
 * @param {string} contentId - Id of the content object
 * @param {Object} taxonomyAndTagsData - Object containing Taxonomy meta data along with applied tags
 * @param {number} taxonomyAndTagsData.id - id of Taxonomy
 * @param {string} taxonomyAndTagsData.name - name of Taxonomy
 * @param {string} taxonomyAndTagsData.description - description of Taxonomy
 * @param {boolean} taxonomyAndTagsData.enabled - Whether Taxonomy is enabled/disabled
 * @param {boolean} taxonomyAndTagsData.allowMultiple - Whether Taxonomy allows multiple tags to be applied
 * @param {boolean} taxonomyAndTagsData.allowFreeText - Whether Taxonomy allows free text tags
 * @param {boolean} taxonomyAndTagsData.systemDefined - Whether Taxonomy is system defined or authored by user
 * @param {boolean} taxonomyAndTagsData.visibleToAuthors - Whether Taxonomy should be visible to object authors
 * @param {string[]} taxonomyAndTagsData.orgs - Array of orgs this Taxonomy belongs to
 * @param {boolean} taxonomyAndTagsData.allOrgs - Whether Taxonomy belongs to all orgs
 * @param {Object[]} taxonomyAndTagsData.contentTags - Array of taxonomy tags that are applied to the content
 * @param {string} taxonomyAndTagsData.contentTags.value - Value of applied Tag
 * @param {string} taxonomyAndTagsData.contentTags.lineage - Array of Tag's ancestors sorted (ancestor -> tag)
 */
const ContentTagsCollapsible = ({ contentId, taxonomyAndTagsData }) => {
  const intl = useIntl();
  const {
    id, name, contentTags,
  } = taxonomyAndTagsData;

  // State to determine whether to update the backend or not
  const [updatingTags, setUpdatingTags] = React.useState(false);
  const mutation = useContentTaxonomyTagsMutation();

  const [isOpen, open, close] = useToggle(false);
  const [target, setTarget] = React.useState(null);

  // Keeps track of the tree structure for the applied content tags passed
  // in as a prop.
  const [appliedContentTags, setAppliedContentTags] = React.useState({});

  // Keeps track of the tree structure for tags that are add by selecting/unselecting
  // tags in the dropdowns.
  const [addedContentTags, setAddedContentTags] = React.useState({});

  // To handle checking/unchecking tags in the SelectableBox
  const [checkedTags, { add, remove }] = useCheckboxSetValues();

  // Handles make requests to the backend whenever the checked tags change
  React.useEffect(() => {
    // We have this check because this hook is fired when the component first load
    // and reloads (on refocus). We only want to make requests to the backend when
    // the user is updating the tags.
    if (updatingTags) {
      setUpdatingTags(false);
      const tags = checkedTags.map(t => decodeURIComponent(t.split(',').slice(-1)));
      mutation.mutate({ contentId, taxonomyId: id, tags });
    }
  }, [contentId, id, checkedTags]);

  const mergeTrees = (tree1, tree2) => {
    const mergedTree = { ...tree1 };

    const sortKeysAlphabetically = (obj) => {
      const sortedObj = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sortedObj[key] = obj[key];
          if (obj[key] && typeof obj[key] === 'object') {
            sortedObj[key].children = sortKeysAlphabetically(obj[key].children);
          }
        });
      return sortedObj;
    };

    const mergeRecursively = (destination, source) => {
      Object.entries(source).forEach(([key, sourceValue]) => {
        const destinationValue = destination[key];

        if (destinationValue && sourceValue && typeof destinationValue === 'object' && typeof sourceValue === 'object') {
          mergeRecursively(destinationValue, sourceValue);
        } else {
          // eslint-disable-next-line no-param-reassign
          destination[key] = sourceValue;
        }
      });
    };

    mergeRecursively(mergedTree, tree2);
    return sortKeysAlphabetically(mergedTree);
  };

  // This converts the contentTags prop to the tree structure mentioned above
  React.useEffect(() => {
    const resultTree = {};

    contentTags.forEach(item => {
      let currentLevel = resultTree;

      item.lineage.forEach((key, index) => {
        if (!currentLevel[key]) {
          const isExplicit = index === item.lineage.length - 1;
          currentLevel[key] = {
            explicit: isExplicit,
            children: {},
          };

          // Populating the SelectableBox with "selected" (explicit) tags
          const value = item.lineage.map(l => encodeURIComponent(l)).join(',');
          // eslint-disable-next-line no-unused-expressions
          isExplicit ? add(value) : remove(value);
        }

        currentLevel = currentLevel[key].children;
      });
    });

    setAppliedContentTags(resultTree);
  }, [contentTags]);

  // This is out source of truth that represents the current state of tags in
  // this Taxonomy as a tree. Whenever either the `appliedContentTags` (i.e. tags passed in
  // the prop from the backed) change, or when the `addedContentTags` (i.e. tags added by
  // selecting/unselecting them in the dropdown) change, the tree is recomputed.
  const tagsTree = React.useMemo(() => (
    mergeTrees(appliedContentTags, addedContentTags)
  ), [appliedContentTags, addedContentTags]);

  // Add tag to the tree, and while traversing remove any selected ancestor tags
  // as they should become implicit
  const addTags = (tree, tagLineage, selectedTag) => {
    const value = [];
    let traversal = tree;
    tagLineage.forEach(tag => {
      const isExplicit = selectedTag === tag;

      if (!traversal[tag]) {
        traversal[tag] = { explicit: isExplicit, children: {} };
      } else {
        traversal[tag].explicit = isExplicit;
      }

      // Clear out the ancestor tags leading to newly selected tag
      // as they automatically become implicit
      value.push(encodeURIComponent(tag));
      // eslint-disable-next-line no-unused-expressions
      isExplicit ? add(value.join(',')) : remove(value.join(','));

      traversal = traversal[tag].children;
    });
  };

  // Remove the tag along with it's ancestors if it was the only explicit child tag
  const removeTags = (tree, tagsToRemove) => {
    if (!tree || !tagsToRemove.length) {
      return;
    }
    const key = tagsToRemove[0];
    if (tree[key]) {
      removeTags(tree[key].children, tagsToRemove.slice(1));

      if (Object.keys(tree[key].children).length === 0 && (tree[key].explicit === false || tagsToRemove.length === 1)) {
        // eslint-disable-next-line no-param-reassign
        delete tree[key];
      }
    }
  };

  const handleSelectableBoxChange = (e) => {
    // eslint-disable-next-line no-unused-expressions
    const tagLineage = e.target.value.split(',').map(t => decodeURIComponent(t));
    const selectedTag = tagLineage.slice(-1)[0];

    const addedTree = { ...addedContentTags };
    if (e.target.checked) {
      // We "add" the tag to the SelectableBox.Set inside the addTags method
      addTags(addedTree, tagLineage, selectedTag);
    } else {
      // Remove tag from the SelectableBox.Set
      remove(e.target.value);

      // We remove them from both incase we are unselecting from an
      // existing applied Tag or a newly added one
      removeTags(addedTree, tagLineage);
      removeTags(appliedContentTags, tagLineage);
    }

    setAddedContentTags(addedTree);
    setUpdatingTags(true);
  };

  return (
    <div className="d-flex">
      <Collapsible title={name} styling="card-lg" className="taxonomy-tags-collapsible">
        <div key={id}>
          <ContentTagsTree tagsTree={tagsTree} removeTagHandler={handleSelectableBoxChange} />
        </div>

        <div className="d-flex taxonomy-tags-selector-menu">
          <Button
            ref={setTarget}
            variant="outline-primary"
            onClick={open}
          >
            <FormattedMessage {...messages.addTagsButtonText} />
          </Button>
        </div>
        <ModalPopup
          hasArrow
          placement="bottom"
          positionRef={target}
          isOpen={isOpen}
          onClose={close}
        >
          <div className="bg-white p-3 shadow">

            <SelectableBox.Set
              type="checkbox"
              name="tags"
              columns={1}
              ariaLabel={intl.formatMessage(messages.taxonomyTagsAriaLabel)}
              className="taxonomy-tags-selectable-box-set"
              onChange={handleSelectableBoxChange}
              value={checkedTags}
            >
              <ContentTagsDropDownSelector
                key={`selector-${id}`}
                taxonomyId={id}
                level={0}
                tagsTree={tagsTree}
              />
            </SelectableBox.Set>
          </div>
        </ModalPopup>

      </Collapsible>
      <div className="d-flex">
        <Badge
          variant="light"
          pill
          className={classNames('align-self-start', 'mt-3', {
            // eslint-disable-next-line quote-props
            'invisible': contentTags.length === 0,
          })}
        >
          {contentTags.length}
        </Badge>
      </div>
    </div>
  );
};

ContentTagsCollapsible.propTypes = {
  contentId: PropTypes.string.isRequired,
  taxonomyAndTagsData: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    contentTags: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.string,
      lineage: PropTypes.arrayOf(PropTypes.string),
    })),
  }).isRequired,
};

export default ContentTagsCollapsible;
