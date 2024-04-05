// @ts-check
import React, { useEffect } from 'react';
import { cloneDeep } from 'lodash';
import { useContentData, useContentTaxonomyTagsData } from './data/apiHooks';
import { useTaxonomyList } from '../taxonomy/data/apiHooks';
import { extractOrgFromContentId } from './utils';

/** @typedef {import("./data/types.mjs").Tag} ContentTagData */

const useContentTagsDrawerHelper = (contentId) => {
  const org = extractOrgFromContentId(contentId);

  // This stores the tags added on the add tags Select in all taxonomies.
  const [stagedContentTags, setStagedContentTags] = React.useState({});
  // When a staged tags on a taxonomy is commitet then is saved on this map.
  const [globalStagedContentTags, setGlobalStagedContentTags] = React.useState({});
  // This stores feched tags deleted by the user.
  const [globalStagedRemovedContentTags, setGlobalStagedRemovedContentTags] = React.useState({});
  // Merges feched tags, global staged tags and global removed staged tags
  const [tagsByTaxonomy, setTagsByTaxonomy] = React.useState([]);
  // const updateTags = useContentTaxonomyTagsUpdater(contentId);

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

      return taxonomiesList;
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

    setTagsByTaxonomy(Object.values(mergedTags));
  }, [
    fechedTaxonomies,
    globalStagedContentTags,
    globalStagedRemovedContentTags,
  ]);

  /*
  const commitGlobalStagedTags = React.useCallback(() => {
    const tagsData = [];
    tagsByTaxonomy.forEach((tags) => {
      tagsData.push({
        taxonomy: tags.id,
        tags: tags.contentTags.map(t => t.value),
      });
    });
    updateTags.mutate(tagsData);
  }, [tagsByTaxonomy]);
  */

  return {
    stagedContentTags,
    setStagedContentTags,
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
  };
};

export default useContentTagsDrawerHelper;
