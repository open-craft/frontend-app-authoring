// @ts-check
import React, { useEffect } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { cloneDeep } from 'lodash';
import { useContentData, useContentTaxonomyTagsData, useContentTaxonomyTagsUpdater } from './data/apiHooks';
import { useTaxonomyList } from '../taxonomy/data/apiHooks';
import { extractOrgFromContentId } from './utils';
import messages from './messages';

/** @typedef {import("./data/types.mjs").Tag} ContentTagData */
/** @typedef {import("./data/types.mjs").StagedTagData} StagedTagData */
/** @typedef {import("./data/types.mjs").TagsInTaxonomy} TagsInTaxonomy */

/**
 * Handles all the underlying logic for the ContentTagsDrawer component
 * @param {string} contentId
 * @returns {{
 *     stagedContentTags: Record<number, StagedTagData[]>,
 *     addStagedContentTag: (taxonomyId: number, addedTag: StagedTagData) => void,
 *     removeStagedContentTag: (taxonomyId: number, tagValue: string) => void,
 *     removeGlobalStagedContentTag: (taxonomyId: number, tagValue: string) => void,
 *     addRemovedContentTag: (taxonomyId: number, addedTag: StagedTagData) => void,
 *     deleteRemovedContentTag: (taxonomyId: number, tagValue: string) => void,
 *     setStagedTags: (taxonomyId: number, tagsList: StagedTagData[]) => void,
 *     globalStagedContentTags: Record<number, StagedTagData[]>,
 *     globalStagedRemovedContentTags: Record<number, string>,
 *     setGlobalStagedContentTags: Function,
 *     commitGlobalStagedTags: () => void,
 *     commitGlobalStagedTagsStatus: string,
 *     isContentDataLoaded: boolean,
 *     isContentTaxonomyTagsLoaded: boolean,
 *     isTaxonomyListLoaded: boolean,
 *     contentName: string,
 *     tagsByTaxonomy: TagsInTaxonomy[],
 *     isEditMode: boolean,
 *     toEditMode: () => void,
 *     toReadMode: () => void,
 *     collapsibleStates: Record<number, boolean>,
 *     openCollapsible: (taxonomyId: number) => void,
 *     closeCollapsible: (taxonomyId: number) => void,
 *     toastMessage: string | undefined,
 *     showToastAfterSave: () => void,
 *     closeToast: () => void,
 * }}
 */
const useContentTagsDrawerHelper = (contentId) => {
  const intl = useIntl();
  const org = extractOrgFromContentId(contentId);

  // True if the drawer is on edit mode.
  const [isEditMode, setIsEditMode] = React.useState(false);
  // This stores the tags added on the add tags Select in all taxonomies.
  const [stagedContentTags, setStagedContentTags] = React.useState({});
  // When a staged tags on a taxonomy is commitet then is saved on this map.
  const [globalStagedContentTags, setGlobalStagedContentTags] = React.useState({});
  // This stores feched tags deleted by the user.
  const [globalStagedRemovedContentTags, setGlobalStagedRemovedContentTags] = React.useState({});
  // Merges feched tags, global staged tags and global removed staged tags
  const [tagsByTaxonomy, setTagsByTaxonomy] = React.useState(/** @type TagsInTaxonomy[] */ ([]));
  // This stores taxonomy collapsible states (open/close).
  const [collapsibleStates, setColapsibleStates] = React.useState({});
  // Message to show a toast in the content drawer.
  const [toastMessage, setToastMessage] = React.useState(/** @type string | undefined */ (undefined));
  // Mutation to update tags
  const updateTags = useContentTaxonomyTagsUpdater(contentId);

  // Fetch from database
  const { data: contentData, isSuccess: isContentDataLoaded } = useContentData(contentId);
  const {
    data: contentTaxonomyTagsData,
    isSuccess: isContentTaxonomyTagsLoaded,
  } = useContentTaxonomyTagsData(contentId);
  const { data: taxonomyListData, isSuccess: isTaxonomyListLoaded } = useTaxonomyList(org);

  // Tags feched from database
  const fechedTaxonomies = React.useMemo(() => {
    if (taxonomyListData && contentTaxonomyTagsData) {
      // Initialize list of content tags in taxonomies to populate
      const taxonomiesList = taxonomyListData.results.map((taxonomy) => ({
        ...taxonomy,
        contentTags: /** @type {ContentTagData[]} */([]),
      }));

      const contentTaxonomies = contentTaxonomyTagsData.taxonomies;

      // eslint-disable-next-line array-callback-return
      contentTaxonomies.map((contentTaxonomyTags) => {
        const contentTaxonomy = taxonomiesList.find((taxonomy) => taxonomy.id === contentTaxonomyTags.taxonomyId);
        if (contentTaxonomy) {
          contentTaxonomy.contentTags = contentTaxonomyTags.tags;
        }
      });

      /// Sort taxonomies
      const taxonomiesWithData = taxonomiesList.filter(
        (t) => t.contentTags.length !== 0,
      ).sort((a, b) => b.contentTags.length - a.contentTags.length);
      const emptyTaxonomies = taxonomiesList.filter(
        (t) => t.contentTags.length === 0,
      ).sort((a, b) => a.name.localeCompare(b.name));

      return [...taxonomiesWithData, ...emptyTaxonomies];
    }
    return [];
  }, [taxonomyListData, contentTaxonomyTagsData]);

  // Add a content tags to the staged tags for a taxonomy
  const addStagedContentTag = React.useCallback((taxonomyId, addedTag) => {
    setStagedContentTags(prevStagedContentTags => {
      const updatedStagedContentTags = {
        ...prevStagedContentTags,
        [taxonomyId]: [...(prevStagedContentTags[taxonomyId] ?? []), addedTag],
      };
      return updatedStagedContentTags;
    });
  }, [setStagedContentTags]);

  // Remove a content tag from the staged tags for a taxonomy
  const removeStagedContentTag = React.useCallback((taxonomyId, tagValue) => {
    setStagedContentTags(prevStagedContentTags => ({
      ...prevStagedContentTags,
      [taxonomyId]: prevStagedContentTags[taxonomyId].filter((t) => t.value !== tagValue),
    }));
  }, [setStagedContentTags]);

  // Remove a content tag from the global staged tags for a taxonomy
  const removeGlobalStagedContentTag = React.useCallback((taxonomyId, tagValue) => {
    setGlobalStagedContentTags(prevContentTags => ({
      ...prevContentTags,
      [taxonomyId]: prevContentTags[taxonomyId].filter((t) => t.value !== tagValue),
    }));
  }, [setGlobalStagedContentTags]);

  // Add a content tags to the removed tags for a taxonomy
  const addRemovedContentTag = React.useCallback((taxonomyId, addedTag) => {
    setGlobalStagedRemovedContentTags(prevContentTags => {
      const updatedStagedContentTags = {
        ...prevContentTags,
        [taxonomyId]: [...(prevContentTags[taxonomyId] ?? []), addedTag],
      };
      return updatedStagedContentTags;
    });
  }, [setGlobalStagedRemovedContentTags]);

  // Remove a content tag from the removed tags for a taxonomy
  const deleteRemovedContentTag = React.useCallback((taxonomyId, tagValue) => {
    setGlobalStagedRemovedContentTags(prevContentTags => ({
      ...prevContentTags,
      [taxonomyId]: prevContentTags[taxonomyId].filter((t) => t !== tagValue),
    }));
  }, [setGlobalStagedRemovedContentTags]);

  // Sets the staged content tags for taxonomy to the provided list of tags
  const setStagedTags = React.useCallback((taxonomyId, tagsList) => {
    setStagedContentTags(prevStagedContentTags => ({ ...prevStagedContentTags, [taxonomyId]: tagsList }));
  }, [setStagedContentTags]);

  // Open a collapsible of a taxonomy
  const openCollapsible = React.useCallback((taxonomyId) => {
    setColapsibleStates(prevStates => ({
      ...prevStates,
      [taxonomyId]: true,
    }));
  }, [setColapsibleStates]);

  // Close a collapsible of a taxonomy
  const closeCollapsible = React.useCallback((taxonomyId) => {
    setColapsibleStates(prevStates => ({
      ...prevStates,
      [taxonomyId]: false,
    }));
  }, [setColapsibleStates]);

  const openAllCollapsible = React.useCallback(() => {
    const updatedState = {};
    fechedTaxonomies.forEach((taxonomy) => {
      updatedState[taxonomy.id] = true;
    });
    setColapsibleStates(updatedState);
  }, [fechedTaxonomies, setColapsibleStates]);

  // Set initial state of collapsible based on content tags
  const setCollapsibleToInitalState = React.useCallback(() => {
    const updatedStated = {};
    fechedTaxonomies.forEach((taxonomy) => {
      // Taxonomy with content tags must be open
      updatedStated[taxonomy.id] = taxonomy.contentTags.length !== 0;
    });
    setColapsibleStates(updatedStated);
  }, [fechedTaxonomies, setColapsibleStates]);

  // First call of the initial collapsible states
  useEffect(() => {
    setCollapsibleToInitalState();
  }, [setCollapsibleToInitalState]);

  // Changes the drawer mode to edit
  const toEditMode = React.useCallback(() => {
    setIsEditMode(true);
    openAllCollapsible();
  }, [setIsEditMode, openAllCollapsible]);

  // Changes the drawer mode to read and clears all staged tags and states.
  const toReadMode = React.useCallback(() => {
    setIsEditMode(false);
    setStagedContentTags({});
    setGlobalStagedContentTags({});
    setGlobalStagedRemovedContentTags({});
    setCollapsibleToInitalState();
  }, [
    setIsEditMode,
    setStagedContentTags,
    setGlobalStagedContentTags,
    setGlobalStagedRemovedContentTags,
    setCollapsibleToInitalState,
  ]);

  // Build toast message and show toast after save drawer.
  const showToastAfterSave = React.useCallback(() => {
    const tagsAddedList = Object.values(globalStagedContentTags);
    const tagsRemovedList = Object.values(globalStagedRemovedContentTags);

    const tagsAdded = tagsAddedList.length === 1 ? tagsAddedList[0].length : tagsAddedList.reduce(
      (acc, curr) => acc + curr.length,
      0,
    );
    const tagsRemoved = tagsRemovedList.length === 1 ? tagsRemovedList[0].length : tagsRemovedList.reduce(
      (acc, curr) => acc + curr.length,
      0,
    );
    let message;
    if (tagsAdded && tagsRemoved) {
      message = intl.formatMessage(
        messages.tagsSaveToastTextTypeAddedAndRemoved,
        { tagsAdded, tagsRemoved },
      );
    } else if (tagsAdded) {
      message = intl.formatMessage(
        messages.tagsSaveToastTextTypeAdded,
        { tagsAdded },
      );
    } else if (tagsRemoved) {
      message = intl.formatMessage(
        messages.tagsSaveToastTextTypeRemoved,
        { tagsRemoved },
      );
    }
    setToastMessage(message);
  }, [globalStagedContentTags, globalStagedRemovedContentTags, setToastMessage]);

  // Close the toast
  const closeToast = React.useCallback(() => setToastMessage(undefined), [setToastMessage]);

  let contentName = '';
  if (isContentDataLoaded) {
    if ('displayName' in contentData) {
      contentName = contentData.displayName;
    } else {
      contentName = contentData.courseDisplayNameWithDefault;
    }
  }

  // Updates `tagsByTaxonomy` merged feched tags, global staged tags
  // and global removed staged tags.
  useEffect(() => {
    const mergedTags = cloneDeep(fechedTaxonomies).reduce((acc, obj) => (
      { ...acc, [obj.id]: obj }
    ), {});

    Object.keys(globalStagedContentTags).forEach((taxonomyId) => {
      if (mergedTags[taxonomyId]) {
        // TODO test this
        // Filter out applied tags that should become implicit because a child tag was committed
        const stagedLineages = globalStagedContentTags[taxonomyId].map((t) => t.lineage.slice(0, -1)).flat();
        const fechedTags = mergedTags[taxonomyId].contentTags.filter((t) => !stagedLineages.includes(t.value));

        mergedTags[taxonomyId].contentTags = [
          ...fechedTags,
          ...globalStagedContentTags[taxonomyId],
        ];
      }
    });

    Object.keys(globalStagedRemovedContentTags).forEach((taxonomyId) => {
      if (mergedTags[taxonomyId]) {
        mergedTags[taxonomyId].contentTags = mergedTags[taxonomyId].contentTags.filter(
          (t) => !globalStagedRemovedContentTags[taxonomyId].includes(t.value),
        );
      }
    });

    // It is constructed this way to maintain the order
    // of the list `fechedTaxonomies`
    const mergedTagsArray = fechedTaxonomies.map(obj => mergedTags[obj.id]);

    setTagsByTaxonomy(mergedTagsArray);
  }, [
    fechedTaxonomies,
    globalStagedContentTags,
    globalStagedRemovedContentTags,
  ]);

  const commitGlobalStagedTags = React.useCallback(() => {
    const tagsData = [];
    tagsByTaxonomy.forEach((tags) => {
      tagsData.push({
        taxonomy: tags.id,
        tags: tags.contentTags.map(t => t.value),
      });
    });
    // @ts-ignore
    updateTags.mutate({ tagsData });
  }, [tagsByTaxonomy]);

  return {
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
    commitGlobalStagedTags,
    commitGlobalStagedTagsStatus: updateTags.status,
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
  };
};

export default useContentTagsDrawerHelper;
