// @ts-check
import { useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaxonomyTagsData,
  getContentTaxonomyTagsData,
  getContentData,
  updateContentTaxonomyTags,
} from './api';

/**
 * Builds the query to get the taxonomy tags
 * @param {number} taxonomyId The id of the taxonomy to fetch tags for
 * @param {string|null} parentTag The tag whose children we're loading, if any
 * @param {string} searchTerm The term passed in to perform search on tags
 * @param {number} numPages How many pages of tags to load at this level
 * @returns {{hasMorePages: boolean, tagPages: {isLoading: boolean, isError: boolean, data: import("./types.mjs").TaxonomyTagData[]}[]}}
 */
export const useTaxonomyTagsData = (taxonomyId, parentTag = null, numPages = 1, searchTerm = "") => {
  const queryClient = useQueryClient();

  const queryFn = async ({queryKey}) => {
    const page = queryKey[3];
    // await new Promise(r => setTimeout(r, 800)); // useful to simulate a slow API response
    return await getTaxonomyTagsData(taxonomyId, { parentTag: parentTag || "", searchTerm, page });
  };

  const queries = [];
  for (let page = 1; page <= numPages; page++) {
    queries.push({ queryKey: ['taxonomyTags', taxonomyId, parentTag, page, searchTerm], queryFn });
  }

  /** @type {import("@tanstack/react-query").UseQueryResult<import("./types.mjs").TaxonomyTagsData>[]} */
  const dataPages = useQueries({queries});


  const totalPages = dataPages[0]?.data?.numPages || 1;
  const hasMorePages = numPages < totalPages;

  const tagPages = useMemo(() => {

    /** @type {{isLoading: boolean, isError: boolean, data: import("./types.mjs").TaxonomyTagData[]}[]} */
    const newTags = [];

    // Pre-load desendants if possible
    const preLoadedData = new Map();

    dataPages.forEach(result => {
      /** @type {import("./types.mjs").TaxonomyTagData[]} */
      let simplifiedTagsList = [];

      result.data?.results?.forEach((tag) => {
        if (tag.parentValue === parentTag) {
          simplifiedTagsList.push(tag);
        } else {
          if (!preLoadedData.has(tag.parentValue)) {
            preLoadedData.set(tag.parentValue, [tag]);
          } else {
            preLoadedData.get(tag.parentValue).push(tag);
          }
        }
      })

      newTags.push({...result, data: simplifiedTagsList});
    });

    // Store the pre-loaded descendants into the query cache:
    preLoadedData.forEach((tags, parentValue) => {
      const queryKey = ['taxonomyTags', taxonomyId, parentValue, 1, searchTerm];
      queryClient.setQueryData(queryKey, {
        next: "",
        previous: "",
        count: tags.length,
        numPages: 1,
        currentPage: 1,
        start: 0,
        results: tags,
      });
    });

    return newTags;
  }, [dataPages]);

  return {hasMorePages, tagPages};
};

/**
 * Builds the query to get the taxonomy tags applied to the content object
 * @param {string} contentId The id of the content object to fetch the applied tags for
 * @returns {import("@tanstack/react-query").UseQueryResult<import("./types.mjs").ContentTaxonomyTagsData>}
 */
export const useContentTaxonomyTagsData = (contentId) => (
  useQuery({
    queryKey: ['contentTaxonomyTags', contentId],
    queryFn: () => getContentTaxonomyTagsData(contentId),
  })
);

/**
 * Builds the query to get meta data about the content object
 * @param {string} contentId The id of the content object (unit/component)
 * @returns {import("@tanstack/react-query").UseQueryResult<import("./types.mjs").ContentData>}
 */
export const useContentData = (contentId) => (
  useQuery({
    queryKey: ['contentData', contentId],
    queryFn: () => getContentData(contentId),
  })
);

/**
 * Builds the mutation to update the tags applied to the content object
 * @param {string} contentId The id of the content object to update tags for
 * @param {number} taxonomyId The id of the taxonomy the tags belong to
 */
export const useContentTaxonomyTagsMutation = (contentId, taxonomyId) => {
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * @type {import("@tanstack/react-query").MutateFunction<
     *   any,
     *   any,
     *   {
     *     tags: string[]
     *   }
     * >}
     */
    mutationFn: ({ tags }) => updateContentTaxonomyTags(contentId, taxonomyId, tags),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contentTaxonomyTags', contentId] });
    },
  });
};
